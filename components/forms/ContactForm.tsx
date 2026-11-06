"use client";

import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";

export function ContactForm({ locale }: { locale: Locale }) {
  const t = content[locale];
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    if (!form.reportValidity()) { setError(t.formError); return; }
    const data = new FormData(form);
    setPending(true);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: data.get("fullName"), companyName: data.get("companyName"), email: data.get("email"), phone: data.get("phone"), message: data.get("message"), locale }) });
      if (!response.ok) throw new Error();
      setDone(true);
    } catch { setError(t.serverError); }
    finally { setPending(false); }
  }
  if (done) return <div className="form-success" role="status"><span className="success-mark">✓</span><p>{t.contactSent}</p></div>;
  return <form className="lead-form contact-form" onSubmit={submit}>
    <div className="form-grid">
      <label className="field"><span>{t.name} *</span><input name="fullName" required minLength={2} maxLength={120} /></label>
      <label className="field"><span>{t.company}</span><input name="companyName" maxLength={160} /></label>
      <label className="field"><span>{t.email} *</span><input name="email" type="email" required maxLength={254} /></label>
      <label className="field"><span>{t.phone}</span><input name="phone" type="tel" maxLength={32} /></label>
      <label className="field field-wide"><span>{t.message} *</span><textarea name="message" rows={5} required minLength={10} maxLength={3000} /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-submit" disabled={pending}>{pending ? t.sending : t.submit}<span>↗</span></button>
  </form>;
}
