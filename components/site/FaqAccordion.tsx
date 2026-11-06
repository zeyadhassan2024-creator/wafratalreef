import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";
import type { FaqRow } from "@/lib/public-data";

type FaqItem = { id: string; question_ar: string; question_en: string; answer_ar: string; answer_en: string };

export function FaqAccordion({ locale, items }: { locale: Locale; items: FaqItem[] }) {
  return <div className="faq-list">{items.map((item, index) => <details className="faq-item" key={item.id} open={index === 0}>
    <summary><span className="faq-count">{String(index + 1).padStart(2, "0")}</span><span>{locale === "ar" ? item.question_ar : item.question_en}</span><span className="faq-plus" aria-hidden="true" /></summary>
    <p>{locale === "ar" ? item.answer_ar : item.answer_en}</p>
  </details>)}</div>;
}

export function PreviewFaq({ locale, faqs }: { locale: Locale; faqs: FaqRow[] }) {
  const defaults = content[locale].productsList.length ? [
    { id: "preview-1", question_en: "What products does Wafrat Al Reef supply?", question_ar: "ما هي المنتجات التي تقوم وفرة الريف بتوريدها؟", answer_en: "We supply a variety of poultry products, including frozen chicken, chicken breast, chicken tender, table eggs, and other poultry products.", answer_ar: "نقوم بتوريد مجموعة متنوعة من منتجات الدواجن تشمل الدجاج المجمد، صدور الدجاج، الفيليه (التندر)، بيض المائدة، وغيرها من منتجات الدواجن." },
    { id: "preview-2", question_en: "Which businesses do you serve?", question_ar: "ما هي القطاعات التي تخدمها الشركة؟", answer_en: "We serve restaurants, hotels, supermarkets, wholesalers, and businesses looking for bulk poultry supplies.", answer_ar: "نخدم المطاعم، الفنادق، السوبرماركت، تجار الجملة، والشركات التي تبحث عن توريد منتجات الدواجن بكميات كبيرة." },
  ] : [];
  return <FaqAccordion locale={locale} items={faqs.length ? faqs.slice(0, 3) : defaults} />;
}
