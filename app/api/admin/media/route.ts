import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/site-admin";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

export async function POST(request: Request) {
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
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
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "upload";
  const objectKey = `site-media/${id}/${safeName}`;
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
  return NextResponse.json({ id, url: `/api/media/${id}`, filename: file.name, contentType: file.type });
}
