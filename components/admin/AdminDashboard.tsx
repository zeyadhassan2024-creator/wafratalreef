"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Package, BadgeCheck, CircleHelp, ClipboardList, FileText, Settings, Images, LogOut, Plus, Pencil, Trash2, Download, Search, UploadCloud, Check, X, RefreshCw, Users, Mail } from "lucide-react";
import { ContactsPanel } from "@/components/admin/ContactsPanel";

type Admin = { id: string; email: string; role: "Administrator" | "Editor" };
type Row = Record<string, unknown> & { id?: string };
type Section = "overview" | "products" | "brands" | "faqs" | "meeting-requests" | "contacts" | "content" | "settings" | "media" | "users";
const sections: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "products", label: "Products", icon: Package },
  { id: "brands", label: "Brands", icon: BadgeCheck }, { id: "faqs", label: "FAQs", icon: CircleHelp },
  { id: "meeting-requests", label: "Meeting requests", icon: ClipboardList }, { id: "contacts", label: "Contact messages", icon: Mail },
  { id: "content", label: "Website content", icon: FileText },
  { id: "settings", label: "Website settings", icon: Settings }, { id: "media", label: "Media library", icon: Images },
  { id: "users", label: "Team & roles", icon: Users },
];
const statuses = ["New", "Contacted", "Meeting Scheduled", "In Progress", "Completed", "Cancelled"];

function csrfToken() {
  if (typeof document === "undefined") return "";
  const pair = document.cookie.split("; ").find((part) => part.startsWith("wafratreef_csrf="));
  return pair ? decodeURIComponent(pair.slice("wafratreef_csrf=".length)) : "";
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = csrfToken();
    if (token) headers.set("x-csrf-token", token);
  }
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

export function AdminDashboard({ admin }: { admin: Admin }) {
  const [section, setSection] = useState<Section>("overview");
  const [items, setItems] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();
  const isAdmin = admin.role === "Administrator";

  const load = useCallback(async (target: Section = section) => {
    setBusy(true);
    try {
      if (target === "overview") {
        const data = await api<Record<string, number>>("/api/admin/summary");
        setSummary(data);
        if (isAdmin) {
          const requests = await api<{ items?: Row[] }>("/api/admin/meeting-requests?limit=5");
          setItems(requests.items ?? []);
        } else setItems([]);
      } else if (target === "media") {
        const data = await api<{ items?: Row[] }>("/api/admin/media");
        setItems(data.items ?? []);
      } else if (target === "products") {
        const [data, categoryData] = await Promise.all([
          api<{ items?: Row[] }>("/api/admin/products"), api<{ items?: Row[] }>("/api/admin/categories"),
        ]);
        setItems(data.items ?? []); setCategories(categoryData.items ?? []);
      } else {
        const query = target === "meeting-requests" ? `?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}` : "";
        const data = await api<{ items?: Row[] }>(`/api/admin/${target}${query}`);
        setItems(data.items ?? []);
      }
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load data. Check database setup.");
      setItems([]);
    } finally { setBusy(false); }
  }, [section, search, status, isAdmin]);

  useEffect(() => { void load(section); }, [section, load]);

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* The server clears the session cookie even if its response is delayed. */ }
    router.replace("/admin/login"); router.refresh();
  }

  async function save(event: FormEvent<HTMLFormElement>, resource: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    for (const field of ["is_visible", "is_published"]) data[field] = formData.has(field);
    const canEditCurrent = Boolean(editing?.id) && ["products", "brands", "faqs"].includes(resource);
    if (canEditCurrent) data.id = editing?.id;
    setBusy(true); setNotice("");
    try {
      await api(`/api/admin/${resource}`, { method: canEditCurrent ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (canEditCurrent) setEditing(null);
      form.reset(); setNotice("Saved successfully."); await load(section);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this item"); }
    finally { setBusy(false); }
  }

  async function remove(resource: string, id: string) {
    if (!window.confirm("Delete this item? This action cannot be undone.")) return;
    try { await api(`/api/admin/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setNotice("Item deleted."); await load(section); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this item."); }
  }

  async function updateLead(id: string, form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    try { await api("/api/admin/meeting-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) }); setNotice("Request updated."); await load(section); }
    catch { setNotice("Could not update the request."); }
  }

  async function updateContact(id: string, isRead: boolean) {
    try { await api("/api/admin/contacts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_read: isRead }) }); setNotice("Contact message updated."); await load("contacts"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update this message."); }
  }

  const title = sections.find((item) => item.id === section)?.label ?? "Overview";
  const visibleSections = sections.filter((item) => isAdmin || !["meeting-requests", "contacts", "settings", "users", "media"].includes(item.id));
  return <div className="admin-page"><header className="admin-topbar"><div className="admin-brand"><Image src="/brand/symbol-badge.png" alt="Wafrat Al Reef" width={48} height={48} /><span>WAFRAT AL REEF <small>ADMIN</small></span></div><div className="admin-locale"><span>{admin.email} · {admin.role}</span><button type="button" className="admin-signout" onClick={logout}><LogOut size={15} /> Sign out</button></div></header>
    <div className="admin-shell"><aside className="admin-sidebar"><p>WORKSPACE</p>{visibleSections.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? "active" : ""} onClick={() => { setSection(id); setEditing(null); setNotice(""); }}><Icon size={16} />{label}</button>)}</aside>
      <main className="admin-main"><div className="admin-title-row"><div><p className="eyebrow">CONTENT MANAGEMENT</p><h1>{title}</h1><p className="admin-subtitle">Manage the information displayed on the Wafrat Al Reef website.</p></div><button className="admin-refresh" type="button" onClick={() => load(section)} aria-label="Refresh"><RefreshCw size={17} /></button></div>
        {notice && <div className="admin-message" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button></div>}{busy && <div className="admin-loading">Loading…</div>}
        {!busy && section === "overview" && <Overview summary={summary} items={items} setSection={setSection} isAdmin={isAdmin} />}
        {!busy && section === "products" && <ProductsPanel items={items} categories={categories} editing={editing} setEditing={setEditing} save={save} remove={remove} setNotice={setNotice} onSaved={() => load("products")} />}
        {!busy && section === "brands" && <BrandsPanel items={items} editing={editing} setEditing={setEditing} save={save} remove={remove} />}
        {!busy && section === "faqs" && <FaqsPanel items={items} editing={editing} setEditing={setEditing} save={save} remove={remove} />}
        {!busy && section === "meeting-requests" && <RequestsPanel items={items} search={search} setSearch={setSearch} status={status} setStatus={setStatus} updateLead={updateLead} />}
        {!busy && section === "contacts" && <ContactsPanel items={items} onSetRead={updateContact} />}
        {!busy && section === "content" && <LocalizedPanel table="content" items={items} />}
        {!busy && section === "settings" && <LocalizedPanel table="settings" items={items} />}
        {!busy && section === "media" && <MediaPanel items={items} onUploaded={() => load("media")} onDelete={remove} setNotice={setNotice} />}
        {!busy && section === "users" && <UsersPanel items={items} onRefresh={() => load("users")} setNotice={setNotice} />}
      </main>
    </div>
  </div>;
}

function Overview({ summary, items, setSection, isAdmin }: { summary: Record<string, number>; items: Row[]; setSection: (section: Section) => void; isAdmin: boolean }) {
  const stats = [["Total meeting requests", summary.totalRequests], ["New enquiries", summary.newRequests], ["Scheduled meetings", summary.scheduled], ["Products", summary.products], ["Active brands", summary.activeBrands], ["Published FAQs", summary.publishedFaqs]];
  return <><div className="admin-stats">{stats.map(([label, number]) => <div className="admin-stat" key={String(label)}><span>{label}</span><strong>{Number(number ?? 0).toLocaleString()}</strong></div>)}</div>{isAdmin && <div className="admin-card"><div className="admin-toolbar"><h2>Recent meeting requests</h2><button type="button" className="admin-text-button" onClick={() => setSection("meeting-requests")}>View all</button></div><RequestsTable items={items.slice(0, 5)} compact /></div>}</>;
}

function ItemList({ items, onEdit, onDelete, fields }: { items: Row[]; onEdit: (item: Row) => void; onDelete: (id: string) => void; fields: string[] | Record<string, string> }) {
  const columns: [string, string][] = Array.isArray(fields) ? fields.map((field) => [field.replaceAll("_", " "), field]) : Object.entries(fields);
  if (!items.length) return <div className="admin-empty">No entries yet. Use the form to add the first one.</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(([label, field]) => <th key={field}>{label}</th>)}<th>Actions</th></tr></thead><tbody>{items.map((item, index) => <tr key={String(item.id ?? index)}>{columns.map(([, field]) => <td key={field}>{typeof item[field] === "boolean" || field.startsWith("is_") ? Number(item[field]) ? <span className="status-pill">Active</span> : <span className="status-pill status-muted">Hidden</span> : String(item[field] ?? "—").slice(0, 110)}</td>)}<td><div className="admin-actions"><button type="button" onClick={() => onEdit(item)}><Pencil size={13} /> Edit</button><button type="button" onClick={() => item.id && onDelete(item.id)}><Trash2 size={13} /> Delete</button></div></td></tr>)}</tbody></table></div>;
}

function ProductsPanel({ items, categories, editing, setEditing, save, remove, setNotice, onSaved }: { items: Row[]; categories: Row[]; editing: Row | null; setEditing: (item: Row | null) => void; save: (event: FormEvent<HTMLFormElement>, resource: string) => void; remove: (resource: string, id: string) => void; setNotice: (message: string) => void; onSaved: () => Promise<void> }) {
  const [categoryEditing, setCategoryEditing] = useState<Row | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    data.is_visible = formData.has("is_visible");
    if (categoryEditing?.id) data.id = categoryEditing.id;
    setCategoryBusy(true); setNotice("");
    try {
      await api("/api/admin/categories", { method: categoryEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setCategoryEditing(null); form.reset(); await onSaved(); setNotice("Category saved successfully.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this category."); }
    finally { setCategoryBusy(false); }
  }
  return <>
    <form key={String(editing?.id ?? "new-product")} className="admin-card admin-form" onSubmit={(event) => save(event, "products")}>
      <div className="admin-form-heading"><h2>{editing ? "Edit product" : "Add a product"}</h2>{editing && <button type="button" className="admin-text-button" onClick={() => setEditing(null)}>Cancel edit</button>}</div>
      {editing?.id && <input type="hidden" name="id" value={editing.id} />}
      <label>English name<input name="name_en" required defaultValue={String(editing?.name_en ?? "")} /></label>
      <label>Arabic name<input name="name_ar" required dir="rtl" defaultValue={String(editing?.name_ar ?? "")} /></label>
      <label>Category<select name="category_id" defaultValue={String(editing?.category_id ?? "")}><option value="">Uncategorized</option>{categories.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name_en)} / {String(item.name_ar)}</option>)}</select></label>
      <label>Display order<input name="sort_order" type="number" defaultValue={String(editing?.sort_order ?? 0)} /></label>
      <label className="field-wide">English description<textarea name="description_en" rows={2} defaultValue={String(editing?.description_en ?? "")} /></label>
      <label className="field-wide">Arabic description<textarea name="description_ar" rows={2} dir="rtl" defaultValue={String(editing?.description_ar ?? "")} /></label>
      <label>Image media key<input name="image_key" defaultValue={String(editing?.image_key ?? "")} placeholder="Paste a copied Media library key" /></label>
      <label>English alt text<input name="alt_en" defaultValue={String(editing?.alt_en ?? "")} /></label>
      <label>Arabic alt text<input name="alt_ar" dir="rtl" defaultValue={String(editing?.alt_ar ?? "")} /></label>
      <label className="admin-checkbox"><input type="checkbox" name="is_visible" defaultChecked={Boolean(editing ? Number(editing.is_visible) : true)} /> Visible on website</label>
      <button className="button button-dark admin-submit" type="submit"><Check size={16} />Save product</button>
    </form>
    <section className="admin-card">
      <form key={String(categoryEditing?.id ?? "new-category")} className="admin-form admin-category-form" onSubmit={(event) => { void saveCategory(event); }}>
        <div className="admin-form-heading"><h2>{categoryEditing ? "Edit product category" : "Add a product category"}</h2>{categoryEditing && <button type="button" className="admin-text-button" onClick={() => setCategoryEditing(null)}>Cancel edit</button>}</div>
        <label>English name<input name="name_en" required defaultValue={String(categoryEditing?.name_en ?? "")} /></label>
        <label>Arabic name<input name="name_ar" required dir="rtl" defaultValue={String(categoryEditing?.name_ar ?? "")} /></label>
        <label>Slug<input name="slug" required pattern="[a-z0-9-]+" title="Use lowercase letters, numbers, and hyphens" defaultValue={String(categoryEditing?.slug ?? "")} /></label>
        <label>Display order<input name="sort_order" type="number" defaultValue={String(categoryEditing?.sort_order ?? 0)} /></label>
        <label className="admin-checkbox"><input type="checkbox" name="is_visible" defaultChecked={Boolean(categoryEditing ? Number(categoryEditing.is_visible) : true)} /> Visible in filters</label>
        <button className="button button-dark admin-submit" type="submit" disabled={categoryBusy}><Check size={16} />{categoryEditing ? "Save category" : "Add category"}</button>
      </form>
      <ItemList items={categories} fields={{ "English title": "name_en", "Arabic title": "name_ar", Slug: "slug", Order: "sort_order", Visible: "is_visible" }} onEdit={setCategoryEditing} onDelete={(id) => remove("categories", id)} />
    </section>
    <div className="admin-card"><div className="admin-toolbar"><h2>Products ({items.length})</h2></div><ItemList items={items} fields={{ Name: "name_en", Category: "category_name_en", Visibility: "is_visible", Order: "sort_order" }} onEdit={setEditing} onDelete={(id) => remove("products", id)} /></div>
  </>;
}

function BrandsPanel({ items, editing, setEditing, save, remove }: { items: Row[]; editing: Row | null; setEditing: (value: Row | null) => void; save: (event: FormEvent<HTMLFormElement>, resource: string) => void; remove: (resource: string, id: string) => void }) {
  return <><div className="admin-card"><div className="admin-toolbar"><h2>{editing ? "Edit brand" : "Add a brand"}</h2>{editing && <button type="button" className="admin-text-button" onClick={() => setEditing(null)}>Cancel edit</button>}</div><form key={String(editing?.id ?? "new-brand")} className="admin-form" onSubmit={(event) => save(event, "brands")}><label className="field"><span>Brand / supplier name *</span><input name="name" defaultValue={String(editing?.name ?? "")} required /></label><label className="field"><span>Logo key (from media library)</span><input name="logo_key" defaultValue={String(editing?.logo_key ?? "")} /></label><label className="field"><span>Alt text — English</span><input name="alt_en" defaultValue={String(editing?.alt_en ?? "")} /></label><label className="field"><span>النص البديل — العربية</span><input name="alt_ar" defaultValue={String(editing?.alt_ar ?? "")} /></label><label className="field"><span>Sort order</span><input type="number" name="sort_order" defaultValue={Number(editing?.sort_order ?? 0)} /></label><label className="admin-check"><input type="checkbox" name="is_visible" defaultChecked={Number(editing?.is_visible ?? 1) === 1} /> Published</label><button className="button button-small" type="submit"><Plus size={15} />{editing ? "Save changes" : "Add brand"}</button></form></div><div className="admin-card"><div className="admin-toolbar"><h2>Brands ({items.length})</h2></div><ItemList items={items} onEdit={setEditing} onDelete={(id) => remove("brands", id)} fields={["name", "is_visible", "sort_order"]} /></div></>;
}

function FaqsPanel({ items, editing, setEditing, save, remove }: { items: Row[]; editing: Row | null; setEditing: (value: Row | null) => void; save: (event: FormEvent<HTMLFormElement>, resource: string) => void; remove: (resource: string, id: string) => void }) {
  return <><div className="admin-card"><div className="admin-toolbar"><h2>{editing ? "Edit FAQ" : "Add a FAQ"}</h2>{editing && <button type="button" className="admin-text-button" onClick={() => setEditing(null)}>Cancel edit</button>}</div><form key={String(editing?.id ?? "new-faq")} className="admin-form" onSubmit={(event) => save(event, "faqs")}><label className="field"><span>Question — English *</span><input name="question_en" defaultValue={String(editing?.question_en ?? "")} required /></label><label className="field"><span>السؤال — العربية *</span><input name="question_ar" defaultValue={String(editing?.question_ar ?? "")} required /></label><label className="field"><span>Answer — English *</span><textarea name="answer_en" defaultValue={String(editing?.answer_en ?? "")} required /></label><label className="field"><span>الإجابة — العربية *</span><textarea name="answer_ar" defaultValue={String(editing?.answer_ar ?? "")} required /></label><label className="field"><span>Sort order</span><input type="number" name="sort_order" defaultValue={Number(editing?.sort_order ?? 0)} /></label><label className="admin-check"><input type="checkbox" name="is_published" defaultChecked={Number(editing?.is_published ?? 1) === 1} /> Published</label><button className="button button-small" type="submit"><Plus size={15} />{editing ? "Save changes" : "Add FAQ"}</button></form></div><div className="admin-card"><div className="admin-toolbar"><h2>FAQs ({items.length})</h2></div><ItemList items={items} onEdit={setEditing} onDelete={(id) => remove("faqs", id)} fields={["question_en", "question_ar", "is_published", "sort_order"]} /></div></>;
}

function RequestsPanel({ items, search, setSearch, status, setStatus, updateLead }: { items: Row[]; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; updateLead: (id: string, form: HTMLFormElement) => void }) {
  return <div className="admin-card"><div className="admin-toolbar"><h2>Business inquiries ({items.length})</h2><a className="admin-export" href={`/api/admin/meeting-requests?format=csv&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`}><Download size={14} /> Export CSV</a></div><div className="admin-filters"><label><Search size={15} /><input placeholder="Search name, company, email, phone" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div><RequestsTable items={items} updateLead={updateLead} /></div>;
}

function RequestsTable({ items, compact = false, updateLead }: { items: Row[]; compact?: boolean; updateLead?: (id: string, form: HTMLFormElement) => void }) {
  if (!items.length) return <div className="admin-empty">No meeting requests have been received yet.</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Received</th><th>Contact</th><th>Company</th><th>Products</th><th>Status & notes</th>{!compact && <th>Update</th>}</tr></thead><tbody>{items.map((item) => <tr key={String(item.id)}><td>{String(item.created_at ?? "").slice(0, 16)}</td><td>{String(item.full_name)}<br /><small>{String(item.email)}</small><br /><small>{String(item.phone)}</small></td><td>{String(item.company_name)}<br /><small>{String(item.business_type)}</small></td><td>{String(item.interested_products ?? "[]")}{item.other_product ? ` · ${String(item.other_product)}` : ""}</td><td>{compact ? <span className="status-pill">{String(item.status)}</span> : <form className="lead-update-form" onSubmit={(event) => { event.preventDefault(); updateLead?.(String(item.id), event.currentTarget); }}><select name="status" defaultValue={String(item.status)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select><textarea name="internal_notes" defaultValue={String(item.internal_notes ?? "")} placeholder="Internal notes" rows={2} /></form>}</td>{!compact && <td><button className="admin-small-button" type="button" onClick={(event) => { const form = event.currentTarget.closest("tr")?.querySelector("form"); if (form) updateLead?.(String(item.id), form); }}><Check size={13} /> Save</button></td>}</tr>)}</tbody></table></div>;
}

function LocalizedPanel({ table, items }: { table: "content" | "settings"; items: Row[] }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const isContent = table === "content";
  const contentKeys = [
    "vision", "mission", "hero_tagline", "hero_text", "home_intro_title", "home_intro",
    "advantages_title", "advantages_text", "home_products_title", "home_products_text",
    "home_brands_title", "home_brands_text", "sectors_title", "coverage_title", "coverage_text",
    "cta_title", "cta_text", "faq_preview_title", "footer_text", "about_title", "about_intro",
    "about_approach_title", "about_approach_text", "products_page_title", "products_page_text",
    "brands_page_title", "brands_page_text", "brands_empty_title", "brands_empty_text", "why_title",
    "why_text", "faq_title", "faq_intro", "meeting_title", "meeting_text", "meeting_aside_title",
    "meeting_aside_text", "contact_title", "contact_text", "contact_aside_title",
    ...Array.from({ length: 4 }, (_, i) => [`advantage_${i + 1}_title`, `advantage_${i + 1}_description`]).flat(),
    ...Array.from({ length: 4 }, (_, i) => [`sector_${i + 1}_title`, `sector_${i + 1}_description`]).flat(),
    ...Array.from({ length: 6 }, (_, i) => [`value_${i + 1}_title`, `value_${i + 1}_description`]).flat(),
  ];
  const settingKeys = ["company_name", "address", "phone", "email", "instagram", "instagram_url", "default_language", "seo_title", "seo_description"];
  const keys = isContent ? contentKeys : settingKeys;
  const labels: Record<string, string> = {
    vision: "Our vision / رؤيتنا", mission: "Our mission / رسالتنا",
    hero_tagline: "Homepage headline / عنوان الواجهة", hero_text: "Homepage description / وصف الواجهة",
    home_intro_title: "Homepage introduction title / عنوان تعريف الشركة", home_intro: "Homepage introduction / تعريف الشركة",
    advantages_title: "Advantages heading / عنوان المزايا", advantages_text: "Advantages introduction / مقدمة المزايا",
    home_products_title: "Homepage products heading / عنوان المنتجات في الرئيسية", home_products_text: "Homepage products introduction / وصف المنتجات في الرئيسية",
    home_brands_title: "Homepage brands heading / عنوان العلامات في الرئيسية", home_brands_text: "Homepage brands introduction / وصف العلامات في الرئيسية",
    sectors_title: "Sectors heading / عنوان القطاعات", coverage_title: "Qatar coverage heading / عنوان التغطية في قطر",
    coverage_text: "Qatar coverage description / وصف التغطية في قطر", cta_title: "Call-to-action heading / عنوان الدعوة للعمل",
    cta_text: "Call-to-action description / وصف الدعوة للعمل", faq_preview_title: "FAQ preview heading / عنوان الأسئلة المختارة",
    footer_text: "Footer statement / عبارة التذييل", about_title: "About page heading / عنوان من نحن",
    about_intro: "About page introduction / مقدمة من نحن", about_approach_title: "Approach heading / عنوان نهجنا",
    about_approach_text: "Approach description / وصف نهجنا", products_page_title: "Products page heading / عنوان المنتجات",
    products_page_text: "Products page description / وصف صفحة المنتجات", brands_page_title: "Brands page heading / عنوان العلامات التجارية",
    brands_page_text: "Brands page description / وصف صفحة العلامات التجارية", brands_empty_title: "Brands empty-state heading / عنوان حالة العلامات الفارغة",
    brands_empty_text: "Brands empty-state description / وصف حالة العلامات الفارغة", why_title: "Why us heading / عنوان لماذا نحن",
    why_text: "Why us description / وصف لماذا نحن", faq_title: "FAQ page heading / عنوان الأسئلة الشائعة",
    faq_intro: "FAQ introduction / مقدمة الأسئلة الشائعة", meeting_title: "Meeting page heading / عنوان طلب الاجتماع",
    meeting_text: "Meeting page description / وصف طلب الاجتماع", meeting_aside_title: "Meeting side heading / العنوان الجانبي لطلب الاجتماع",
    meeting_aside_text: "Meeting side description / الوصف الجانبي لطلب الاجتماع", contact_title: "Contact page heading / عنوان التواصل",
    contact_text: "Contact page description / وصف التواصل", contact_aside_title: "Contact side heading / العنوان الجانبي للتواصل",
    company_name: "Company name / اسم الشركة", address: "Company address / عنوان الشركة", phone: "Phone / WhatsApp / الهاتف",
    email: "Email / البريد الإلكتروني", instagram: "Instagram handle / حساب إنستغرام", instagram_url: "Instagram URL / رابط إنستغرام",
    default_language: "Default language / اللغة الافتراضية", seo_title: "SEO title / عنوان SEO", seo_description: "SEO description / وصف SEO",
  };
  for (let index = 1; index <= 6; index++) {
    labels[`value_${index}_title`] = `Value ${index} — title / عنوان القيمة ${index}`;
    labels[`value_${index}_description`] = `Value ${index} — description / وصف القيمة ${index}`;
  }
  for (let index = 1; index <= 4; index++) {
    labels[`advantage_${index}_title`] = `Advantage ${index} — title / عنوان الميزة ${index}`;
    labels[`advantage_${index}_description`] = `Advantage ${index} — description / وصف الميزة ${index}`;
    labels[`sector_${index}_title`] = `Sector ${index} — title / عنوان القطاع ${index}`;
    labels[`sector_${index}_description`] = `Sector ${index} — description / وصف القطاع ${index}`;
  }
  async function submit(event: FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault(); setBusy(true); setNotice("");
    const data = new FormData(event.currentTarget);
    const language = String(data.get("default_language") ?? "en");
    const valueAr = !isContent && key === "default_language" ? language : String(data.get("value_ar") ?? "");
    const valueEn = !isContent && key === "default_language" ? language : String(data.get("value_en") ?? "");
    const payload = { [isContent ? "content_key" : "setting_key"]: key, value_ar: valueAr, value_en: valueEn };
    try { await api(`/api/admin/${table}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); setNotice("Saved. Refresh the public page to see the update."); }
    catch { setNotice("Could not save this value."); }
    finally { setBusy(false); }
  }
  const isLong = (key: string) => ["vision", "mission", "seo_description"].includes(key) || /(_text|_intro|_description)$/.test(key);
  return <div className="admin-card localized-editor"><div className="admin-toolbar"><h2>{isContent ? "Bilingual CMS content" : "Company details & SEO"}</h2></div>{notice && <div className="admin-message" role="status">{notice}</div>}{keys.map((key) => { const idKey = isContent ? "content_key" : "setting_key"; const existing = items.find((row) => row[idKey] === key); return <div className="localized-item" key={key}><div className="localized-label"><strong>{labels[key] ?? key}</strong><span>{key}</span></div><form key={`${String(existing?.value_en ?? "")}:${String(existing?.value_ar ?? "")}`} onSubmit={(event) => submit(event, key)}>{key === "default_language" ? <label className="field field-wide"><span>Default language / اللغة الافتراضية</span><select name="default_language" defaultValue={String(existing?.value_en ?? "en")}><option value="en">English</option><option value="ar">العربية</option></select></label> : <><label className="field"><span>English</span>{isLong(key) ? <textarea name="value_en" defaultValue={String(existing?.value_en ?? "")} rows={3} /> : <input name="value_en" defaultValue={String(existing?.value_en ?? "")} />}</label><label className="field" dir="rtl"><span>العربية</span>{isLong(key) ? <textarea name="value_ar" defaultValue={String(existing?.value_ar ?? "")} rows={3} /> : <input name="value_ar" defaultValue={String(existing?.value_ar ?? "")} />}</label></>}<button className="admin-small-button" disabled={busy}>Save / حفظ</button></form></div>; })}</div>;
}

function MediaPanel({ items, onUploaded, onDelete, setNotice }: { items: Row[]; onUploaded: () => void; onDelete: (resource: string, id: string) => void; setNotice: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [altAr, setAltAr] = useState(""); const [altEn, setAltEn] = useState("");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); data.set("alt_ar", altAr); data.set("alt_en", altEn); setBusy(true);
    try { const headers = new Headers(); const token = csrfToken(); if (token) headers.set("x-csrf-token", token); const response = await fetch("/api/admin/media", { method: "POST", headers, body: data, cache: "no-store" }); const result = await response.json() as { error?: string; objectKey?: string }; if (!response.ok) throw new Error(result.error || "Upload failed"); setNotice(`Image uploaded. Use this key in a product or brand record: ${result.objectKey ?? ""}`); form.reset(); setAltAr(""); setAltEn(""); onUploaded(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  return <><div className="admin-card"><h2>Upload media</h2><p>PNG, JPEG or WebP, up to 5 MB. Provide alternative text in both languages.</p><form className="admin-form" onSubmit={upload}><label className="field field-wide"><span>Choose an image</span><input name="file" type="file" accept="image/png,image/jpeg,image/webp" required /></label><label className="field"><span>Alt text — English</span><input value={altEn} onChange={(event) => setAltEn(event.target.value)} maxLength={250} /></label><label className="field"><span>النص البديل — العربية</span><input dir="rtl" value={altAr} onChange={(event) => setAltAr(event.target.value)} maxLength={250} /></label><button className="button button-small" disabled={busy}><UploadCloud size={15} />{busy ? "Uploading…" : "Upload image"}</button></form></div><div className="admin-card"><div className="admin-toolbar"><h2>Media assets ({items.length})</h2></div>{items.length ? <div className="media-grid">{items.map((item) => { const key = String(item.object_key ?? ""); const url = `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`; return <article className="media-card" key={String(item.id)}><Image src={url} alt={String(item.alt_en ?? item.filename ?? "Uploaded media")} width={180} height={130} unoptimized /><strong>{String(item.filename ?? key)}</strong><code>{key}</code><div className="admin-actions"><button type="button" onClick={() => navigator.clipboard?.writeText(key)}>Copy key</button><button type="button" onClick={() => onDelete("media", String(item.id))}><Trash2 size={13} /> Delete</button></div></article>; })}</div> : <div className="admin-empty">No uploaded media yet. Supplier logos and product photos should be added only after approval.</div>}</div></>;
}

function UsersPanel({ items, onRefresh, setNotice }: { items: Row[]; onRefresh: () => void; setNotice: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form).entries());
    try { await api("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); form.reset(); setNotice("Team member added."); onRefresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not add team member."); }
    finally { setBusy(false); }
  }
  async function changeRole(id: string, role: string) {
    try { await api("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }) }); setNotice("Role updated."); onRefresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update role."); }
  }
  async function remove(id: string) {
    if (!window.confirm("Remove this team account?")) return;
    try { await api(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setNotice("Team member removed."); onRefresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not remove team member."); }
  }
  return <><div className="admin-card"><div className="admin-toolbar"><h2>Add a team member</h2></div><form className="admin-form" onSubmit={create}><label className="field"><span>Email *</span><input type="email" name="email" required maxLength={254} /></label><label className="field"><span>Temporary password (12+ characters) *</span><input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label><label className="field"><span>Role</span><select name="role" defaultValue="Editor"><option value="Editor">Editor</option><option value="Administrator">Administrator</option></select></label><button className="button button-small" disabled={busy}><Plus size={15} />Add user</button></form></div><div className="admin-card"><div className="admin-toolbar"><h2>Team accounts ({items.length})</h2></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={String(item.id)}><td>{String(item.email)}</td><td><select value={String(item.role)} onChange={(event) => void changeRole(String(item.id), event.target.value)}><option value="Administrator">Administrator</option><option value="Editor">Editor</option></select></td><td>{String(item.created_at ?? "").slice(0, 10)}</td><td><button type="button" className="admin-small-button" onClick={() => void remove(String(item.id))}><Trash2 size={13} /> Remove</button></td></tr>)}</tbody></table></div></div></>;
}
