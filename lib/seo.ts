import type { Metadata } from "next";
import type { Locale } from "@/lib/content";
import { getSiteSetting } from "@/lib/public-data";

const defaultTitle = { en: "Wafrat Al Reef | Poultry Supply & Distribution", ar: "وفرة الريف | توريد منتجات الدواجن للأعمال" };
const defaultDescription = {
  en: "Your B2B poultry supply and distribution partner in Qatar. Diverse product options, flexible supply and competitive value.",
  ar: "شريككم لتوريد وتوزيع منتجات الدواجن للأعمال في قطر. خيارات متنوعة وتوريد مرن وقيمة تنافسية.",
};

export async function seoMetadata(locale: Locale, path: string, title: { en: string; ar: string }, description: { en: string; ar: string }): Promise<Metadata> {
  const [siteTitle, siteDescription] = await Promise.all([
    getSiteSetting("seo_title", locale, defaultTitle[locale]),
    getSiteSetting("seo_description", locale, defaultDescription[locale]),
  ]);
  const pageTitle = locale === "ar" ? title.ar : title.en;
  const pageDescription = siteDescription && siteDescription !== defaultDescription[locale] ? siteDescription : locale === "ar" ? description.ar : description.en;
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const localizedPath = (lang: Locale) => `/${lang}${normalizedPath ? `/${normalizedPath}` : ""}`;
  const canonical = localizedPath(locale);
  const fullUrl = siteUrl ? `${siteUrl}${canonical}` : undefined;
  const brand = locale === "ar" ? "وفرة الريف" : "Wafrat Al Reef";
  const titleWithBrand = `${pageTitle} | ${siteTitle || brand}`;
  const logoUrl = siteUrl ? `${siteUrl}/brand/logo-wafrat-al-reef.png` : undefined;
  const socialImages = logoUrl ? [logoUrl] : undefined;
  return {
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: titleWithBrand,
    description: pageDescription,
    alternates: { canonical, languages: { en: localizedPath("en"), ar: localizedPath("ar") } },
    openGraph: { type: "website", siteName: siteTitle || brand, title: titleWithBrand, description: pageDescription, ...(fullUrl ? { url: fullUrl } : {}), ...(socialImages ? { images: socialImages } : {}), locale: locale === "ar" ? "ar_QA" : "en_QA" },
    twitter: { card: "summary_large_image", title: titleWithBrand, description: pageDescription, ...(socialImages ? { images: socialImages } : {}) },
    keywords: locale === "ar"
      ? ["موردو الدواجن في قطر", "توريد الدجاج المجمد قطر", "توريد دواجن بالجملة الدوحة", "موردو الدجاج للمطاعم في قطر"]
      : ["Poultry suppliers Qatar", "Frozen chicken suppliers Qatar", "Wholesale poultry supply Doha", "Chicken suppliers for restaurants in Qatar"],
  };
}
