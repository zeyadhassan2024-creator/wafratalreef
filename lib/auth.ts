import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { first, run, newId } from "@/lib/db";

export type AdminRole = "Administrator" | "Editor";
export type AdminUser = { id: string; email: string; role: AdminRole };
const SESSION_COOKIE = "wafratreef_session";
const CSRF_COOKIE = "wafratreef_csrf";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function digest(value: string) {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64Url(new Uint8Array(result));
}

function sessionCookieOptions(maxAge = SESSION_SECONDS) {
  return { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", maxAge };
}

export async function hashPassword(password: string, salt = toBase64Url(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 210_000 }, key, 256);
  return `pbkdf2$210000$${salt}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, rounds, salt, expected] = stored.split("$");
  const iterations = Number(rounds);
  if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 500_000 || !salt || !expected) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations }, key, 256);
  return constantTimeEqual(toBase64Url(new Uint8Array(bits)), expected);
}

export async function createSession(adminId: string) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const csrfToken = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await digest(token);
  const csrfHash = await digest(csrfToken);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await run("INSERT INTO sessions (id, admin_id, token_hash, csrf_token_hash, expires_at) VALUES (?, ?, ?, ?, ?)", [newId("ses"), adminId, tokenHash, csrfHash, expiresAt]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  jar.set(CSRF_COOKIE, csrfToken, { ...sessionCookieOptions(), httpOnly: false });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", [await digest(token)]);
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const admin = await first<AdminUser & { expires_at: string }>(
    "SELECT a.id, a.email, a.role, s.expires_at FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1",
    [await digest(token), new Date().toISOString()],
  );
  return admin ? { id: admin.id, email: admin.email, role: admin.role } : null;
}

export async function verifyCsrf(request: Request) {
  const headerToken = request.headers.get("x-csrf-token") ?? "";
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value ?? "";
  const sessionToken = jar.get(SESSION_COOKIE)?.value ?? "";
  if (!headerToken || !cookieToken || !sessionToken || !constantTimeEqual(headerToken, cookieToken)) return false;
  const session = await first<{ csrf_token_hash: string }>(
    "SELECT csrf_token_hash FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1",
    [await digest(sessionToken), new Date().toISOString()],
  );
  return session ? constantTimeEqual(await digest(headerToken), session.csrf_token_hash) : false;
}

export async function requireAdmin(role?: AdminRole) {
  const admin = await getCurrentAdmin();
  if (!admin) return { admin: null, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  if (role === "Administrator" && admin.role !== "Administrator") {
    return { admin: null, response: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { admin, response: null };
}

export async function requireAdminRequest(request: Request, role?: AdminRole) {
  const result = await requireAdmin(role);
  if (result.response) return result;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase()) && !(await verifyCsrf(request))) {
    return { admin: null, response: Response.json({ error: "csrf_invalid" }, { status: 403 }) };
  }
  return result;
}

export async function setupKeyIsValid(candidate: string) {
  const { env } = await getCloudflareContext({ async: true });
  const expected = env.ADMIN_SETUP_KEY;
  if (!expected || candidate.length < 16) return false;
  const [a, b] = await Promise.all([digest(candidate), digest(expected)]);
  return constantTimeEqual(a, b);
}
