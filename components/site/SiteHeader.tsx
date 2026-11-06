"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";
import { LanguageSwitch } from "@/components/site/LanguageSwitch";

const routes = ["about", "products", "brands", "why-us", "faqs", "contact"] as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const t = content[locale];
  return <header className="site-header"><div className="container header-inner">
    <Link href={`/${locale}`} className="brand-lockup" aria-label="Wafrat Al Reef home"><Image src="/brand/logo-wafrat-al-reef.png" alt="Wafrat Al Reef | وفرة الريف" width={240} height={152} priority /></Link>
    <button className="menu-toggle" type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
    <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation">
      {routes.map((route) => <Link key={route} href={`/${locale}/${route}`} onClick={() => setOpen(false)}>{t.nav[route === "why-us" ? "why" : route === "faqs" ? "faqs" : route]}</Link>)}
      <LanguageSwitch locale={locale} className="nav-language" />
      <Link className="button button-small" href={`/${locale}/request-meeting`} onClick={() => setOpen(false)}>{t.requestMeeting}<ArrowUpRight size={15} /></Link>
    </nav>
  </div></header>;
}
