import { NextResponse } from "next/server";
import { newId, run } from "@/lib/db";
import { contactSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const input = parsed.data;
    await run("INSERT INTO contact_messages (id, full_name, company_name, email, phone, message) VALUES (?, ?, ?, ?, ?, ?)", [newId("msg"), input.fullName, input.companyName, input.email.toLowerCase(), input.phone, input.message]);
    return NextResponse.json({ received: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
