import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";
import { getSiteContent, getSiteSetting } from "@/lib/public-data";
import { LanguageSwitch } from "@/components/site/LanguageSwitch";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = content[locale];
  const [phone, email, address, instagram, instagramUrl, footerText] = await Promise.all([
    getSiteSetting("phone", locale, "+974 33220608"),
    getSiteSetting("email", locale, "info@wafratalreef.com"),
    getSiteSetting("address", locale, t.companyAddress),
    getSiteSetting("instagram", locale, "@wafrat_alreef"),
    getSiteSetting("instagram_url", locale, "https://www.instagram.com/wafrat_alreef/"),
    getSiteContent("footer_text", locale, t.footerText),
  ]);
  const phoneLink = phone.replace(/[^+0-9]/g, "");
  const nav = [[t.nav.about, `/${locale}/about`], [t.nav.products, `/${locale}/products`], [t.nav.brands, `/${locale}/brands`], [t.nav.faqs, `/${locale}/faqs`], [t.nav.contact, `/${locale}/contact`]];
  return <footer className="site-footer"><div className="container footer-top">
    <div className="footer-brand"><Link href={`/${locale}`}><Image src="/brand/logo-wafrat-al-reef.png" alt="وفرة الريف | Wafrat Al Reef" width={230} height={145} /></Link><p>{footerText}</p></div>
    <div className="footer-links"><span className="footer-label">{locale === "ar" ? "استكشف" : "Explore"}</span>{nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div>
    <div className="footer-contact"><span className="footer-label">{locale === "ar" ? "تواصل معنا" : "Contact"}</span><a href={`tel:${phoneLink}`}>{phone}</a><a href={`mailto:${email}`}>{email}</a><a href={instagramUrl} target="_blank" rel="noreferrer">{instagram}</a><span>{address}</span></div>
  </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Wafrat Al Reef</span><Link href="/admin/login">{locale === "ar" ? "دخول الإدارة" : "Admin"}</Link><LanguageSwitch locale={locale} /></div></footer>;
}
