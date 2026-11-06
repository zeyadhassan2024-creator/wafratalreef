import { NextResponse } from "next/server";
import { all, first, run, newId } from "@/lib/db";
import { meetingStatuses } from "@/lib/validation";
import { requireAdmin, requireAdminRequest } from "@/lib/auth";

const tableByResource: Record<string, string> = {
  products: "products", brands: "brands", faqs: "faqs", categories: "product_categories",
  "meeting-requests": "meeting_requests", contacts: "contact_messages", content: "cms_content", settings: "site_settings",
};
const adminOnly = new Set(["meeting-requests", "contacts", "settings"]);
const safeText = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const toFlag = (value: unknown) => value === true || value === 1 || value === "1" || value === "true" || value === "on" ? 1 : 0;
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

async function authorized(resource: string, request?: Request, mutation = false) {
  const role = adminOnly.has(resource) ? "Administrator" : undefined;
  return request && mutation ? requireAdminRequest(request, role) : requireAdmin(role);
}

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  if (resource === "summary") {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    try {
      const [requests, newRequests, scheduled, products, brands, faqs, unreadContacts] = await Promise.all([
        first<{ total: number }>("SELECT COUNT(*) AS total FROM meeting_requests"),
        first<{ total: number }>("SELECT COUNT(*) AS total FROM meeting_requests WHERE status = 'New'"),
        first<{ total: number }>("SELECT COUNT(*) AS total FROM meeting_requests WHERE status = 'Meeting Scheduled'"),
        first<{ total: number }>("SELECT COUNT(*) AS total FROM products"),
        first<{ total: number }>("SELECT COUNT(*) AS total FROM brands WHERE is_visible = 1"),
        first<{ total: number }>("SELECT COUNT(*) AS total FROM faqs WHERE is_published = 1"),
        first<{ total: number }>("SELECT COUNT(*) AS total FROM contact_messages WHERE is_read = 0"),
      ]);
      return NextResponse.json({ totalRequests: requests?.total ?? 0, newRequests: (newRequests?.total ?? 0) + (unreadContacts?.total ?? 0), scheduled: scheduled?.total ?? 0, products: products?.total ?? 0, activeBrands: brands?.total ?? 0, publishedFaqs: faqs?.total ?? 0 });
    } catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
  }
  const table = tableByResource[resource];
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = await authorized(resource);
  if (auth.response) return auth.response;
  try {
    if (resource === "meeting-requests") {
      const url = new URL(request.url);
      const search = safeText(url.searchParams.get("search"), 120);
      const status = safeText(url.searchParams.get("status"), 40);
      const where: string[] = [];
      const values: unknown[] = [];
      if (status && meetingStatuses.includes(status as typeof meetingStatuses[number])) { where.push("status = ?"); values.push(status); }
      if (search) { where.push("(full_name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone LIKE ?)"); const match = `%${search}%`; values.push(match, match, match, match); }
      const maxRows = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 500));
      const rows = await all<Record<string, unknown>>(`SELECT * FROM ${table}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT ${maxRows}`, values);
      if (url.searchParams.get("format") === "csv") {
        const columns = ["created_at", "full_name", "job_title", "company_name", "email", "phone", "business_type", "interested_products", "other_product", "estimated_monthly_quantity", "preferred_meeting_at", "status", "internal_notes", "additional_notes"];
        const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
        const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => cell(row[column])).join(","))].join("\r\n");
        return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=meeting-requests.csv", "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ items: rows });
    }
    if (resource === "categories") return NextResponse.json({ items: await all(`SELECT * FROM ${table} ORDER BY sort_order ASC, created_at DESC LIMIT 500`) });
    const sort = resource === "contacts" ? "created_at DESC" : "sort_order ASC, created_at DESC";
    return NextResponse.json({ items: await all<Record<string, unknown>>(`SELECT * FROM ${table} ORDER BY ${sort} LIMIT 500`) });
  } catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const table = tableByResource[resource];
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = await authorized(resource, request, true);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = newId(resource.slice(0, 3));
    if (resource === "products") {
      const nameAr = safeText(body.name_ar, 160), nameEn = safeText(body.name_en, 160);
      if (!nameAr || !nameEn) return NextResponse.json({ error: "name_required" }, { status: 400 });
      const slug = safeText(body.slug, 100) || slugify(nameEn) || id;
      await run("INSERT INTO products (id, slug, category_id, name_ar, name_en, description_ar, description_en, image_key, alt_ar, alt_en, is_visible, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, slug, safeText(body.category_id, 100) || null, nameAr, nameEn, safeText(body.description_ar), safeText(body.description_en), safeText(body.image_key, 300) || null, safeText(body.alt_ar, 250), safeText(body.alt_en, 250), toFlag(body.is_visible), Number(body.sort_order) || 0]);
    } else if (resource === "brands") {
      const name = safeText(body.name, 160);
      if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
      await run("INSERT INTO brands (id, name, logo_key, alt_ar, alt_en, is_visible, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, name, safeText(body.logo_key, 300) || null, safeText(body.alt_ar, 250), safeText(body.alt_en, 250), toFlag(body.is_visible), Number(body.sort_order) || 0]);
    } else if (resource === "faqs") {
      const fields = [safeText(body.question_ar, 500), safeText(body.question_en, 500), safeText(body.answer_ar), safeText(body.answer_en)];
      if (fields.some((field) => !field)) return NextResponse.json({ error: "faq_fields_required" }, { status: 400 });
      await run("INSERT INTO faqs (id, question_ar, question_en, answer_ar, answer_en, is_published, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, ...fields, toFlag(body.is_published), Number(body.sort_order) || 0]);
    } else if (resource === "categories") {
      const nameAr = safeText(body.name_ar, 120), nameEn = safeText(body.name_en, 120);
      if (!nameAr || !nameEn) return NextResponse.json({ error: "name_required" }, { status: 400 });
      await run("INSERT INTO product_categories (id, slug, name_ar, name_en, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, ?)", [id, safeText(body.slug, 100) || slugify(nameEn), nameAr, nameEn, Number(body.sort_order) || 0, toFlag(body.is_visible)]);
    } else if (resource === "content" || resource === "settings") {
      const key = safeText(body.content_key ?? body.setting_key, 100);
      if (!key) return NextResponse.json({ error: "key_required" }, { status: 400 });
      const contentTable = resource === "content" ? "cms_content" : "site_settings";
      const keyColumn = resource === "content" ? "content_key" : "setting_key";
      await run(`INSERT INTO ${contentTable} (${keyColumn}, value_ar, value_en) VALUES (?, ?, ?) ON CONFLICT(${keyColumn}) DO UPDATE SET value_ar = excluded.value_ar, value_en = excluded.value_en, updated_at = CURRENT_TIMESTAMP`, [key, safeText(body.value_ar), safeText(body.value_en)]);
      return NextResponse.json({ saved: true }, { status: 201 });
    } else return NextResponse.json({ error: "unsupported_operation" }, { status: 405 });
    return NextResponse.json({ id, created: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("UNIQUE") ? "duplicate_entry" : "service_unavailable";
    return NextResponse.json({ error: message }, { status: message === "duplicate_entry" ? 409 : 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const table = tableByResource[resource];
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = await authorized(resource, request, true);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = safeText(body.id, 200);
    if (resource === "meeting-requests") {
      if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const status = safeText(body.status, 40);
      if (status && !meetingStatuses.includes(status as typeof meetingStatuses[number])) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
      await run("UPDATE meeting_requests SET status = COALESCE(?, status), internal_notes = COALESCE(?, internal_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status || null, Object.hasOwn(body, "internal_notes") ? safeText(body.internal_notes, 4000) : null, id]);
      return NextResponse.json({ updated: true });
    }
    if (resource === "contacts") {
      if (!id || !Object.hasOwn(body, "is_read")) return NextResponse.json({ error: "id_and_read_state_required" }, { status: 400 });
      await run("UPDATE contact_messages SET is_read = ? WHERE id = ?", [toFlag(body.is_read), id]);
      return NextResponse.json({ updated: true });
    }
    if (resource === "content" || resource === "settings") {
      const tableName = resource === "content" ? "cms_content" : "site_settings";
      const keyName = resource === "content" ? "content_key" : "setting_key";
      const key = safeText(body[keyName] ?? body.id, 100);
      if (!key) return NextResponse.json({ error: "key_required" }, { status: 400 });
      await run(`INSERT INTO ${tableName} (${keyName}, value_ar, value_en) VALUES (?, ?, ?) ON CONFLICT(${keyName}) DO UPDATE SET value_ar = excluded.value_ar, value_en = excluded.value_en, updated_at = CURRENT_TIMESTAMP`, [key, safeText(body.value_ar), safeText(body.value_en)]);
      return NextResponse.json({ updated: true });
    }
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
    const columns: Record<string, string[]> = {
      products: ["slug", "category_id", "name_ar", "name_en", "description_ar", "description_en", "image_key", "alt_ar", "alt_en", "is_visible", "sort_order"],
      brands: ["name", "logo_key", "alt_ar", "alt_en", "is_visible", "sort_order"],
      faqs: ["question_ar", "question_en", "answer_ar", "answer_en", "is_published", "sort_order"],
      categories: ["slug", "name_ar", "name_en", "sort_order", "is_visible"],
    };
    const allowed = columns[resource] ?? [];
    const entries = allowed.filter((column) => Object.hasOwn(body, column)).map((column) => {
      if (column === "category_id") return [column, safeText(body[column], 100) || null] as const;
      if (["is_visible", "is_published"].includes(column)) return [column, toFlag(body[column])] as const;
      if (column === "sort_order") return [column, Number(body[column]) || 0] as const;
      return [column, safeText(body[column], 4000)] as const;
    });
    if (!entries.length) return NextResponse.json({ error: "no_changes" }, { status: 400 });
    const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
    await run(`UPDATE ${table} SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...entries.map(([, value]) => value), id]);
    return NextResponse.json({ updated: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("UNIQUE") ? "duplicate_entry" : "service_unavailable";
    return NextResponse.json({ error: message }, { status: message === "duplicate_entry" ? 409 : 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const table = tableByResource[resource];
  if (!table || !["products", "brands", "faqs", "categories"].includes(resource)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = await authorized(resource, request, true);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  try { await run(`DELETE FROM ${table} WHERE id = ?`, [id]); return NextResponse.json({ deleted: true }); }
  catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
}
