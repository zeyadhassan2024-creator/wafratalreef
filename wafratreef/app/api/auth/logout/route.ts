import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  try { await clearSession(); } catch { /* the cookie is still cleared below */ }
  return NextResponse.json({ signedOut: true });
}
