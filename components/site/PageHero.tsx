import Image from "next/image";
import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text?: string; children?: ReactNode }) {
  return <section className="page-hero"><div className="container page-hero-inner"><div className="page-hero-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{text && <p className="page-hero-text">{text}</p>}{children}</div><div className="page-hero-ornament" aria-hidden="true"><Image src="/brand/symbol-badge.png" alt="" width={270} height={270} priority /></div></div></section>;
}
