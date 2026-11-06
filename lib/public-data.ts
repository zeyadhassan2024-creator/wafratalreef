import { all, first } from "@/lib/db";
import type { Locale } from "@/lib/content";

export type FaqRow = { id: string; question_ar: string; question_en: string; answer_ar: string; answer_en: string; sort_order: number };
export type ProductRow = { id: string; slug: string; category_id: string | null; category_name_ar?: string | null; category_name_en?: string | null; name_ar: string; name_en: string; description_ar: string; description_en: string; image_key: string | null; alt_ar: string; alt_en: string; sort_order: number };
export type BrandRow = { id: string; name: string; logo_key: string | null; alt_ar: string; alt_en: string; sort_order: number };

export async function getFaqs() {
  try { return await all<FaqRow>("SELECT id, question_ar, question_en, answer_ar, answer_en, sort_order FROM faqs WHERE is_published = 1 ORDER BY sort_order ASC"); }
  catch { return []; }
}

export async function getProducts() {
  try {
    return await all<ProductRow>("SELECT p.id, p.slug, p.category_id, c.name_ar AS category_name_ar, c.name_en AS category_name_en, p.name_ar, p.name_en, p.description_ar, p.description_en, p.image_key, p.alt_ar, p.alt_en, p.sort_order FROM products p LEFT JOIN product_categories c ON c.id = p.category_id WHERE p.is_visible = 1 AND (p.category_id IS NULL OR c.is_visible = 1) ORDER BY p.sort_order ASC");
  } catch { return []; }
}

export async function getBrands() {
  try { return await all<BrandRow>("SELECT id, name, logo_key, alt_ar, alt_en, sort_order FROM brands WHERE is_visible = 1 ORDER BY sort_order ASC"); }
  catch { return []; }
}

export async function getSiteContent(key: string, locale: Locale, fallback: string) {
  try {
    const row = await first<{ value_ar: string; value_en: string }>("SELECT value_ar, value_en FROM cms_content WHERE content_key = ?", [key]);
    return row ? (locale === "ar" ? row.value_ar : row.value_en) || fallback : fallback;
  } catch { return fallback; }
}

export async function getSiteSetting(key: string, locale: Locale, fallback: string) {
  try {
    const row = await first<{ value_ar: string; value_en: string }>("SELECT value_ar, value_en FROM site_settings WHERE setting_key = ?", [key]);
    return row ? (locale === "ar" ? row.value_ar : row.value_en) || fallback : fallback;
  } catch { return fallback; }
}
