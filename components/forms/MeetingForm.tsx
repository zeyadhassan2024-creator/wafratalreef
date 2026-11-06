"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";

const productChoices = [
  ["Frozen Whole Chicken", "دجاج كامل مجمد"], ["Chicken Breast", "صدور الدجاج"], ["Chicken Tender", "تندر / فيليه الدجاج"], ["Table Eggs", "بيض المائدة"], ["Special Cuts", "قطع خاصة"],
];
const businessChoices = [
  ["Restaurant", "مطعم"], ["Hotel", "فندق"], ["Supermarket", "سوبرماركت"], ["Wholesaler", "تاجر جملة"], ["Catering / Foodservice", "تموين / خدمات غذائية"], ["Other", "أخرى"],
];

export function MeetingForm({ locale, contactPhone = "+974 33220608" }: { locale: Locale; contactPhone?: string }) {
  const t = content[locale];
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showOther, setShowOther] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").replace(/[\s-]/g, "");
    const otherProduct = String(data.get("otherProduct") || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = /^\+?974\d{8}$/.test(phone);
    const productsOk = selected.length > 0 || (showOther && otherProduct.length > 0);
    if (!form.reportValidity() || !emailOk || !phoneOk || !productsOk) { setError(t.formError); return; }
    setPending(true);
    const payload = {
      fullName: data.get("fullName"), jobTitle: data.get("jobTitle"), companyName: data.get("companyName"), email,
      phone: String(data.get("phone") || ""), businessType: data.get("businessType"), interestedProducts: selected,
      otherProduct, estimatedMonthlyQuantity: data.get("estimatedMonthlyQuantity"),
      preferredMeetingAt: data.get("preferredMeetingAt"), additionalNotes: data.get("additionalNotes"), locale,
    };
    try {
      const response = await fetch("/api/meeting-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("request_failed");
      setSuccess(true); form.reset(); setSelected([]); setShowOther(false);
    } catch { setError(t.serverError); }
    finally { setPending(false); }
  }

  if (success) return <div className="form-success" role="status"><span className="success-mark">✓</span><p>{t.sent}</p><a href={`tel:${contactPhone.replace(/[^+0-9]/g, "")}`}>{contactPhone}</a></div>;

  return <form className="lead-form" onSubmit={submit} noValidate>
    <div className="form-grid">
      <Field label={t.name} name="fullName" required />
      <Field label={t.jobTitle} name="jobTitle" required />
      <Field label={t.company} name="companyName" required />
      <Field label={t.email} name="email" type="email" required />
      <Field label={t.phone} name="phone" type="tel" required pattern={String.raw`\+?974[\s-]?[0-9]{8}`} hint={locale === "ar" ? "مثال: +974 33220608" : "Format: +974 33220608"} />
      <label className="field"><span>{t.businessType} <b>*</b></span><select name="businessType" required defaultValue=""><option value="" disabled>{t.choose}</option>{businessChoices.map(([en, ar]) => <option key={en} value={en}>{locale === "ar" ? ar : en}</option>)}</select></label>
      <fieldset className="field field-wide"><legend>{t.interestedProducts} <b>*</b></legend><div className="checkbox-grid">{productChoices.map(([en, ar]) => <label className="check-option" key={en}><input type="checkbox" value={en} checked={selected.includes(en)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, en] : current.filter((item) => item !== en))} /><span>{locale === "ar" ? ar : en}</span></label>)}<label className="check-option"><input type="checkbox" checked={showOther} onChange={(event) => setShowOther(event.target.checked)} /><span>{locale === "ar" ? "أخرى" : "Other"}</span></label></div>{showOther && <input className="other-product-input" name="otherProduct" placeholder={t.otherProduct} maxLength={160} required />}</fieldset>
      <Field label={t.quantity} name="estimatedMonthlyQuantity" optional locale={locale} />
      <Field label={t.meetingTime} name="preferredMeetingAt" type="datetime-local" optional locale={locale} />
      <label className="field field-wide"><span>{t.notes} <small>{t.optional}</small></span><textarea name="additionalNotes" rows={4} maxLength={2000} /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-submit" type="submit" disabled={pending}>{pending ? t.sending : t.submit}<span aria-hidden="true">↗</span></button>
  </form>;
}

function Field({ label, name, type = "text", required = false, optional = false, locale, pattern, hint }: { label: string; name: string; type?: string; required?: boolean; optional?: boolean; locale?: Locale; pattern?: string; hint?: string }) {
  const t = locale ? content[locale] : content.en;
  return <label className="field"><span>{label} {required && <b>*</b>} {optional && <small>{t.optional}</small>}</span><input name={name} type={type} required={required} pattern={pattern} maxLength={254} aria-describedby={hint ? `${name}-hint` : undefined} />{hint && <small id={`${name}-hint`}>{hint}</small>}</label>;
}
