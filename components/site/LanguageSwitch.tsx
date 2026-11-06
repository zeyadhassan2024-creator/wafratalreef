"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/content";

export function LanguageSwitch({ locale, className = "" }: { locale: Locale; className?: string }) {
  const pathname = usePathname() || `/${locale}`;
  const nextLocale = locale === "en" ? "ar" : "en";
  const destination = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${nextLocale}`);
  return <Link className={className} href={destination} lang={nextLocale}>{nextLocale === "ar" ? "العربية" : "English"}</Link>;
}
