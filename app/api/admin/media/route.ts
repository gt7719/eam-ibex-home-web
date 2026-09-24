import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { readJsonObject } from "../../../lib/http-input";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

function matchesSignature(type: string, bytes: Uint8Array) {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a][index]);
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (type === "video/mp4") return ascii(4, 4) === "ftyp";
  if (type === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (type === "application/pdf") return ascii(0, 5) === "%PDF-";
  return false;
}

async function cleanupOrphanedMedia(now = new Date()) {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await env.DB.prepare(
    "SELECT id,object_key FROM media_assets WHERE created_at < ? AND NOT EXISTS (SELECT 1 FROM site_content WHERE instr(value_json, '/api/media/' || media_assets.id) > 0) ORDER BY created_at ASC LIMIT 20",
  ).bind(cutoff).all<{ id: string; object_key: string }>();
  for (const row of rows.results || []) {
    await env.BUCKET.delete(row.object_key);
    await env.DB.prepare("DELETE FROM media_assets WHERE id=?").bind(row.id).run();
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "media.upload")) {
    return NextResponse.json({ error: "Медиа файл байршуулах эрх олгогдоогүй байна." }, { status: 403 });
  }
  await cleanupOrphanedMedia().catch((error) => console.error("media_orphan_cleanup_failed", error));
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload файл олдсонгүй." }, { status: 400 });
  }
  if (!allowedTypes.has(file.type) || file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Зөвшөөрөгдсөн зураг, MP4/WebM видео эсвэл PDF файл 25MB-аас бага байна." },
      { status: 400 },
    );
  }
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesSignature(file.type, signature)) {
    return NextResponse.json({ error: "Файлын бодит төрөл сонгосон форматтай тохирохгүй байна." }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "upload";
  const objectKey = `site-media/${id}/${safeName}`;
  try {
    await env.BUCKET.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { uploadedBy: user.id, originalName: file.name },
    });
    await env.DB.prepare(
      `INSERT INTO media_assets
       (id, object_key, filename, content_type, size_bytes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, objectKey, file.name, file.type, file.size, user.id, new Date().toISOString())
      .run();
  } catch (error) {
    await env.BUCKET.delete(objectKey).catch(() => undefined);
    console.error("media_upload_storage_failed", error);
    return NextResponse.json({ error: "Файлыг найдвартай хадгалж чадсангүй. Дахин оролдоно уу." }, { status: 503 });
  }
  return NextResponse.json({ id, url: `/api/media/${id}`, filename: file.name, contentType: file.type });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "media.upload")) return NextResponse.json({ error: "Медиа файл устгах эрхгүй байна." }, { status: 403 });
  const parsedBody = await readJsonObject<{ id?: string }>(request, 4_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
  if (!body.id || !/^[a-zA-Z0-9-]{1,100}$/.test(body.id)) return NextResponse.json({ error: "Медиа ID буруу байна." }, { status: 400 });
  const reference = `/api/media/${body.id}`;
  const used = await env.DB.prepare("SELECT key FROM site_content WHERE instr(value_json, ?) > 0 LIMIT 1").bind(reference).first<{ key: string }>();
  if (used) return NextResponse.json({ error: "Энэ файл нийтлэгдсэн эсвэл хадгалсан мэдээлэлд ашиглагдаж байна." }, { status: 409 });
  const record = await env.DB.prepare("SELECT object_key FROM media_assets WHERE id = ? LIMIT 1").bind(body.id).first<{ object_key: string }>();
  if (!record) return NextResponse.json({ error: "Медиа файл олдсонгүй." }, { status: 404 });
  await env.BUCKET.delete(record.object_key);
  await env.DB.prepare("DELETE FROM media_assets WHERE id = ?").bind(body.id).run();
  return NextResponse.json({ deleted: true });
}
