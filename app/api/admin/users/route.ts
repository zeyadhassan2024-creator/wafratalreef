import { NextResponse } from "next/server";
import { all, first, newId, run } from "@/lib/db";
import { hashPassword, requireAdminRequest } from "@/lib/auth";

const safeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";

async function authorize(request: Request) {
  return requireAdminRequest(request, "Administrator");
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try { return NextResponse.json({ items: await all("SELECT id, email, role, created_at FROM admins ORDER BY created_at ASC") }); }
  catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const email = safeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role === "Administrator" ? "Administrator" : body.role === "Editor" ? "Editor" : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128 || !role) return NextResponse.json({ error: "invalid_user_input" }, { status: 400 });
    const id = newId("adm");
    await run("INSERT INTO admins (id, email, password_hash, role) VALUES (?, ?, ?, ?)", [id, email, await hashPassword(password), role]);
    return NextResponse.json({ id, email, role, created: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("UNIQUE") ? "email_already_exists" : "service_unavailable";
    return NextResponse.json({ error: message }, { status: message === "email_already_exists" ? 409 : 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const role = body.role === "Administrator" || body.role === "Editor" ? body.role : "";
    if (!id || !role) return NextResponse.json({ error: "invalid_user_input" }, { status: 400 });
    if (id === auth.admin?.id && role !== "Administrator") return NextResponse.json({ error: "cannot_demote_current_admin" }, { status: 400 });
    const target = await first<{ role: string }>("SELECT role FROM admins WHERE id = ?", [id]);
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (target.role === "Administrator" && role !== "Administrator") {
      const admins = await first<{ total: number }>("SELECT COUNT(*) AS total FROM admins WHERE role = 'Administrator'");
      if ((admins?.total ?? 0) <= 1) return NextResponse.json({ error: "last_admin_required" }, { status: 409 });
    }
    await run("UPDATE admins SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [role, id]);
    return NextResponse.json({ updated: true });
  } catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  if (id === auth.admin?.id) return NextResponse.json({ error: "cannot_delete_current_admin" }, { status: 400 });
  try {
    const target = await first<{ role: string }>("SELECT role FROM admins WHERE id = ?", [id]);
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (target.role === "Administrator") {
      const admins = await first<{ total: number }>("SELECT COUNT(*) AS total FROM admins WHERE role = 'Administrator'");
      if ((admins?.total ?? 0) <= 1) return NextResponse.json({ error: "last_admin_required" }, { status: 409 });
    }
    await run("DELETE FROM admins WHERE id = ?", [id]);
    return NextResponse.json({ deleted: true });
  } catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
}
