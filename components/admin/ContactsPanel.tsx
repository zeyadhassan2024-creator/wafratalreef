"use client";

import { useMemo, useState } from "react";
import { Mail, Search, Check } from "lucide-react";

type ContactMessage = { id?: string; full_name?: string; company_name?: string; email?: string; phone?: string; message?: string; is_read?: number; created_at?: string };

export function ContactsPanel({ items, onSetRead }: { items: ContactMessage[]; onSetRead: (id: string, isRead: boolean) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => items.filter((item) => `${item.full_name ?? ""} ${item.company_name ?? ""} ${item.email ?? ""} ${item.phone ?? ""} ${item.message ?? ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return <section className="admin-card"><div className="admin-toolbar"><h2>Contact messages ({items.length})</h2><label className="admin-contact-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" /></label></div>{filtered.length ? <div className="contact-message-list">{filtered.map((item) => { const isRead = Number(item.is_read) === 1; return <article key={String(item.id)} className={`contact-message-card ${isRead ? "" : "is-unread"}`}><div className="contact-message-head"><div><strong>{String(item.full_name ?? "")}</strong>{item.company_name && <span>{String(item.company_name)}</span>}</div><time>{String(item.created_at ?? "").slice(0, 16)}</time></div><div className="contact-message-meta"><a href={`mailto:${encodeURIComponent(String(item.email ?? ""))}`}>{String(item.email ?? "")}</a>{item.phone && <a href={`tel:${String(item.phone).replace(/[^+0-9]/g, "")}`}>{String(item.phone)}</a>}</div><p>{String(item.message ?? "")}</p><button className="admin-small-button" type="button" onClick={() => item.id && onSetRead(item.id, !isRead)}>{isRead ? <Mail size={14} /> : <Check size={14} />}{isRead ? "Mark unread" : "Mark as read"}</button></article>; })}</div> : <div className="admin-empty">{items.length ? "No messages match this search." : "No contact messages have been received yet."}</div>}</section>;
}
