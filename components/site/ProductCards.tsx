import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Drumstick, PackageCheck, Egg, Boxes } from "lucide-react";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";
import type { ProductRow } from "@/lib/public-data";

const categoryIcons = [Drumstick, PackageCheck, Drumstick, Egg, Boxes];
const mediaUrl = (key: string) => `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;

export function ProductCards({ locale, products }: { locale: Locale; products?: ProductRow[] }) {
  const t = content[locale];
  const items = products?.length ? products.map((product) => ({
    id: product.id, name: locale === "ar" ? product.name_ar : product.name_en,
    description: locale === "ar" ? product.description_ar : product.description_en,
    category: locale === "ar" ? product.category_name_ar : product.category_name_en,
    image: product.image_key, alt: locale === "ar" ? product.alt_ar : product.alt_en,
  })) : t.productsList.map(([nameEn, nameAr, description]) => ({ id: nameEn, name: locale === "ar" ? nameAr : nameEn, description, category: "", image: null, alt: "" }));
  return <div className="product-grid">{items.map((item, index) => { const Icon = categoryIcons[index % categoryIcons.length]; const image = item.image ? mediaUrl(item.image) : null; return <article className="product-card" key={item.id}>
    <div className={`product-card-art art-${index % 5}`}>{image ? <Image src={image} alt={item.alt || item.name} width={700} height={460} unoptimized /> : <><span className="product-orbit" /><Icon size={34} strokeWidth={1.25} /></>}</div>
    <div className="product-card-info"><span className="product-type">{item.category || (locale === "ar" ? "توريد للأعمال" : "BUSINESS SUPPLY")}</span><h3>{item.name}</h3><p>{item.description || t.noProducts}</p><Link href={`/${locale}/request-meeting`} className="text-link">{t.requestInfo}<ArrowUpRight size={15} /></Link></div>
  </article>; })}</div>;
}
