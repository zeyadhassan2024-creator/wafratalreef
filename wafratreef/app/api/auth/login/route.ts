import { NextResponse } from "next/server";
import { first } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    const user = await first<{ id: string; email: string; password_hash: string; role: "Administrator" | "Editor" }>(
      "SELECT id, email, password_hash, role FROM admins WHERE email = ? COLLATE NOCASE LIMIT 1",
      [parsed.data.email.trim()],
    );
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
