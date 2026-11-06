import { NextResponse } from "next/server";
import { all, first, getD1, newId, run } from "@/lib/db";
import { requireAdmin, requireAdminRequest } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try { return NextResponse.json({ items: await all("SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 200") }); }
  catch { return NextResponse.json({ error: "service_unavailable" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request, "Administrator");
  if (auth.response) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > maxBytes) {
      return NextResponse.json({ error: "invalid_file", message: "Use a PNG, JPEG or WebP image up to 5 MB." }, { status: 400 });
    }
    const objectKey = `media/${crypto.randomUUID()}.${file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1]}`;
    const { env } = await getCloudflareContext({ async: true });
    if (!env.MEDIA) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    await env.MEDIA.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=3600" } });
    const id = newId("media");
    const altAr = String(form.get("alt_ar") ?? "").slice(0, 250);
    const altEn = String(form.get("alt_en") ?? "").slice(0, 250);
    await run("INSERT INTO media_assets (id, object_key, filename, mime_type, byte_size, alt_ar, alt_en) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, objectKey, file.name.slice(0, 250), file.type, file.size, altAr, altEn]);
    const url = `/api/media/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
    return NextResponse.json({ id, objectKey, url }, { status: 201 });
  } catch { return NextResponse.json({ error: "upload_failed" }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest(request, "Administrator");
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  try {
    const asset = await first<{ object_key: string }>("SELECT object_key FROM media_assets WHERE id = ?", [id]);
    if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const [productUse, brandUse] = await Promise.all([
      first<{ total: number }>("SELECT COUNT(*) AS total FROM products WHERE image_key = ?", [asset.object_key]),
      first<{ total: number }>("SELECT COUNT(*) AS total FROM brands WHERE logo_key = ?", [asset.object_key]),
    ]);
    if ((productUse?.total ?? 0) + (brandUse?.total ?? 0) > 0) return NextResponse.json({ error: "asset_in_use" }, { status: 409 });
    const { env } = await getCloudflareContext({ async: true });
    if (!env.MEDIA) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    await env.MEDIA.delete(asset.object_key);
    await run("DELETE FROM media_assets WHERE id = ?", [id]);
    return NextResponse.json({ deleted: true });
  } catch { return NextResponse.json({ error: "delete_failed" }, { status: 503 }); }
}
