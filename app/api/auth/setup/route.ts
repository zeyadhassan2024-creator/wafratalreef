import { NextResponse } from "next/server";
import { newId, run, first } from "@/lib/db";
import { createSession, hashPassword, setupKeyIsValid } from "@/lib/auth";
import { setupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = setupSchema.safeParse(await request.json());
    if (!parsed.success || !(await setupKeyIsValid(parsed.success ? parsed.data.setupKey : ""))) {
      return NextResponse.json({ error: "invalid_setup" }, { status: 400 });
    }
    const id = newId("adm");
    await run(
      "INSERT INTO admins (id, email, password_hash, role) SELECT ?, ?, ?, 'Administrator' WHERE NOT EXISTS (SELECT 1 FROM admins)",
      [id, parsed.data.email.trim().toLowerCase(), await hashPassword(parsed.data.password)],
    );
    const created = await first<{ id: string }>("SELECT id FROM admins WHERE id = ? LIMIT 1", [id]);
    if (!created) return NextResponse.json({ error: "setup_closed" }, { status: 409 });
    await createSession(id);
    return NextResponse.json({ created: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
