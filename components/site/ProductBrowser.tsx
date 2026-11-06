"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search, ArrowUpRight, Drumstick, PackageCheck, Egg, Boxes } from "lucide-react";
import Link from "next/link";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";
import type { ProductRow } from "@/lib/public-data";

const icons = [Drumstick, PackageCheck, Drumstick, Egg, Boxes];
const mediaUrl = (key: string) => `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;

export function ProductBrowser({ locale, products }: { locale: Locale; products: ProductRow[] }) {
  const t = content[locale];
  const defaults = t.productsList.map(([en, ar, description], index) => ({ id: `category-${index}`, slug: `category-${index}`, category_id: `category-${index}`, category_name_ar: ar, category_name_en: en, name_ar: ar, name_en: en, description_ar: description, description_en: description, image_key: null, alt_ar: "", alt_en: "", sort_order: index }));
  const items = products.length ? products : defaults;
  const categories = Array.from(new Map(items.map((product) => [product.category_id ?? "other", product])).entries());
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => items.filter((item) => {
    const name = locale === "ar" ? item.name_ar : item.name_en;
    const categoryName = locale === "ar" ? item.category_name_ar : item.category_name_en;
    return (category === "all" || item.category_id === category) && `${name} ${categoryName ?? ""} ${item.description_ar} ${item.description_en}`.toLowerCase().includes(query.toLowerCase());
  }), [items, category, query, locale]);
  return <>
    <div className="catalog-tools"><label className="catalog-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchProducts} aria-label={t.searchProducts} /></label><div className="category-filters"><button type="button" className={category === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setCategory("all")}>{t.allCategories}</button>{categories.map(([id, item]) => <button type="button" key={id} className={category === id ? "filter-chip active" : "filter-chip"} onClick={() => setCategory(id)}>{locale === "ar" ? item.category_name_ar ?? item.name_ar : item.category_name_en ?? item.name_en}</button>)}</div></div>
    {filtered.length ? <div className="product-grid">{filtered.map((item, index) => { const Icon = icons[index % icons.length]; const name = locale === "ar" ? item.name_ar : item.name_en; const image = item.image_key ? mediaUrl(item.image_key) : null; return <article className="product-card" key={item.id}><div className={`product-card-art art-${index % 5}`}>{image ? <Image src={image} alt={(locale === "ar" ? item.alt_ar : item.alt_en) || name} width={700} height={460} unoptimized /> : <><span className="product-orbit" /><Icon size={34} strokeWidth={1.25} /></>}</div><div className="product-card-info"><span className="product-type">{locale === "ar" ? item.category_name_ar ?? "توريد للأعمال" : item.category_name_en ?? "BUSINESS SUPPLY"}</span><h3>{name}</h3><p>{locale === "ar" ? item.description_ar : item.description_en}</p><Link href={`/${locale}/request-meeting`} className="text-link">{t.requestInfo}<ArrowUpRight size={15} /></Link></div></article>; })}</div> : <div className="empty-state"><p>{t.noProducts}</p></div>}
  </>;
}
