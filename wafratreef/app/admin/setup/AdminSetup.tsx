"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type SetupResponse = { error?: string };

export function AdminSetup() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const data = new FormData(event.currentTarget); setBusy(true);
    try {
      const response = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupKey: data.get("setupKey"), email: data.get("email"), password: data.get("password"), confirmPassword: data.get("confirmPassword") }) });
      const result = await response.json() as SetupResponse;
      if (!response.ok) throw new Error(result.error === "setup_closed" ? "An administrator account has already been created. Please sign in." : "Setup key is not valid, or the service is not configured yet.");
      router.replace("/admin"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create the administrator."); }
    finally { setBusy(false); }
  }
  return <main className="admin-page admin-login-page"><div className="admin-login-wrap"><Link href="/en"><Image src="/brand/logo-wafrat-al-reef.png" alt="Wafrat Al Reef" width={190} height={120} priority /></Link><p className="eyebrow">FIRST-TIME SETUP</p><h1>Create administrator</h1><p>This one-time setup creates the first administrator account for the website.</p><form onSubmit={submit}><label className="field"><span>Private setup key</span><input type="password" name="setupKey" autoComplete="off" required minLength={16} /></label><label className="field"><span>Email address</span><input type="email" name="email" autoComplete="username" required /></label><label className="field"><span>Create password (12 characters or more)</span><input type="password" name="password" autoComplete="new-password" required minLength={12} /></label><label className="field"><span>Confirm password</span><input type="password" name="confirmPassword" autoComplete="new-password" required minLength={12} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "Creating…" : "Create administrator"}</button></form><p className="setup-link"><Link href="/admin/login">Back to sign in</Link></p></div></main>;
}
