import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentAdmin();
    return user ? NextResponse.json({ user }) : NextResponse.json({ user: null }, { status: 401 });
  } catch {
    return NextResponse.json({ user: null }, { status: 503 });
  }
}
