"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const data = new FormData(event.currentTarget); setBusy(true);
    try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) }); const result = await response.json(); if (!response.ok) throw new Error(response.status === 401 ? "Email or password is incorrect." : "Admin access is not available yet. Complete the initial setup first."); router.replace("/admin"); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  return <main className="admin-page admin-login-page"><div className="admin-login-wrap"><Link href="/en"><Image src="/brand/logo-wafrat-al-reef.png" alt="Wafrat Al Reef" width={190} height={120} priority /></Link><p className="eyebrow">ADMIN PORTAL</p><h1>Sign in</h1><p>Manage the website, products and business enquiries.</p><form onSubmit={submit}><label className="field"><span>Email address</span><input type="email" name="email" autoComplete="username" required /></label><label className="field"><span>Password</span><input type="password" name="password" autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><p className="setup-link">First time here? <Link href="/admin/setup">Set up the first administrator</Link></p></div></main>;
}
