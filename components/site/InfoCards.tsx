import { BadgeCheck, Handshake, Truck, Users, Layers3, CircleDollarSign, Boxes, Scale, SlidersHorizontal, MapPinned, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Locale } from "@/lib/content";
import { content } from "@/lib/content";
import { getSiteContent } from "@/lib/public-data";

const valueIcons = [BadgeCheck, Handshake, Truck, Users, Layers3, CircleDollarSign];
const advantageIcons = [Boxes, Scale, SlidersHorizontal, MapPinned];

export async function ValuesSection({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const t = content[locale];
  const valueItems = await Promise.all(t.valueItems.map(async ([title, description], index) => [
    await getSiteContent(`value_${index + 1}_title`, locale, title),
    await getSiteContent(`value_${index + 1}_description`, locale, description),
  ] as const));
  return <section className={`section values-section ${compact ? "section-compact" : ""}`}>
    <div className="container">
      <div className="section-heading"><p className="eyebrow">{locale === "ar" ? "ما نؤمن به" : "WHAT GUIDES US"}</p><h2>{compact ? t.valuesHeading : t.ourValues}</h2></div>
      <div className="value-grid">{valueItems.map(([title, desc], i) => { const Icon = valueIcons[i]; return <article className="value-card" key={`value-${i + 1}`}><span className="icon-tile"><Icon size={22} strokeWidth={1.7} /></span><h3>{title}</h3><p>{desc}</p></article>; })}</div>
    </div>
  </section>;
}

export async function AdvantagesSection({ locale }: { locale: Locale }) {
  const t = content[locale];
  const [title, description, cards] = await Promise.all([
    getSiteContent("advantages_title", locale, t.advantages),
    getSiteContent("advantages_text", locale, t.advantagesText),
    Promise.all(t.advantagesCards.map(async ([cardTitle, cardText], index) => [
      await getSiteContent(`advantage_${index + 1}_title`, locale, cardTitle),
      await getSiteContent(`advantage_${index + 1}_description`, locale, cardText),
    ] as const)),
  ]);
  return <section className="section advantages-section"><div className="container">
    <div className="section-heading section-heading-row"><div><p className="eyebrow">{locale === "ar" ? "قيمة للأعمال" : "BUILT FOR BUSINESS"}</p><h2>{title}</h2></div><p>{description}</p></div>
    <div className="advantage-grid">{cards.map(([cardTitle, cardText], i) => { const Icon = advantageIcons[i]; return <article key={`advantage-${i + 1}`} className="advantage-card"><span className="advantage-number">0{i + 1}</span><Icon className="advantage-icon" size={26} strokeWidth={1.6} /><h3>{cardTitle}</h3><p>{cardText}</p></article>; })}</div>
  </div></section>;
}

export async function SectorsSection({ locale }: { locale: Locale }) {
  const t = content[locale];
  const [title, cards] = await Promise.all([
    getSiteContent("sectors_title", locale, t.sectors),
    Promise.all(t.sectorsCards.map(async ([cardTitle, cardText], index) => [
      await getSiteContent(`sector_${index + 1}_title`, locale, cardTitle),
      await getSiteContent(`sector_${index + 1}_description`, locale, cardText),
    ] as const)),
  ]);
  return <section className="section sectors-section"><div className="container"><div className="section-heading"><p className="eyebrow">{locale === "ar" ? "شركاء أعمالنا" : "WHO WE SERVE"}</p><h2>{title}</h2></div><div className="sector-grid">{cards.map(([cardTitle, cardText], index) => <article key={`sector-${index + 1}`} className={`sector-card sector-${index + 1}`}><span>0{index + 1}</span><h3>{cardTitle}</h3><p>{cardText}</p><ArrowUpRight size={20} /></article>)}</div></div></section>;
}

export async function CtaBanner({ locale }: { locale: Locale }) {
  const t = content[locale];
  const [title, description] = await Promise.all([
    getSiteContent("cta_title", locale, t.together),
    getSiteContent("cta_text", locale, t.togetherText),
  ]);
  return <section className="cta-section"><div className="container cta-panel"><div><p className="eyebrow eyebrow-light">{locale === "ar" ? "ابدأ محادثة أعمال" : "START A BUSINESS CONVERSATION"}</p><h2>{title}</h2><p>{description}</p></div><Link className="button button-light" href={`/${locale}/request-meeting`}>{t.requestMeeting}<ArrowUpRight size={17} /></Link><span className="cta-orbit" aria-hidden="true" /></div></section>;
}
