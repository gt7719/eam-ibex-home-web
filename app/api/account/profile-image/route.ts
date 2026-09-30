import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getSiteUserSession } from "../../../lib/site-user-auth";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 2 * 1024 * 1024;

function matchesImageSignature(type: string, bytes: Uint8Array) {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png")
    return bytes
      .slice(0, 8)
      .every(
        (value, index) =>
          value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
      );
  return (
    type === "image/webp" && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP"
  );
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getSiteUserSession();
  if (!user)
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Зураг сонгоно уу." }, { status: 400 });
  if (!imageTypes.has(file.type) || file.size > maxBytes) {
    return NextResponse.json(
      { error: "JPEG, PNG эсвэл WebP зураг 2MB-аас бага байна." },
      { status: 400 },
    );
  }
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesImageSignature(file.type, signature))
    return NextResponse.json(
      { error: "Зургийн бодит формат тохирохгүй байна." },
      { status: 400 },
    );
  const prior = await env.DB.prepare(
    "SELECT object_key FROM site_user_profile_images WHERE user_id=? LIMIT 1",
  )
    .bind(user.id)
    .first<{ object_key: string }>();
  const id = crypto.randomUUID();
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectKey = `site-user-profile/${user.id}/${id}.${extension}`;
  const now = new Date().toISOString();
  try {
    await env.BUCKET.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "private, no-store",
      },
      customMetadata: { owner: user.id, originalName: file.name },
    });
    await env.DB.prepare(
      `INSERT INTO site_user_profile_images (id,user_id,object_key,filename,content_type,size_bytes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,object_key=excluded.object_key,filename=excluded.filename,
       content_type=excluded.content_type,size_bytes=excluded.size_bytes,updated_at=excluded.updated_at`,
    )
      .bind(
        id,
        user.id,
        objectKey,
        file.name.slice(0, 240),
        file.type,
        file.size,
        now,
        now,
      )
      .run();
  } catch (error) {
    await env.BUCKET.delete(objectKey).catch(() => undefined);
    console.error("site_user_profile_image_upload_failed", error);
    return NextResponse.json(
      { error: "Зургийг хадгалж чадсангүй. Дахин оролдоно уу." },
      { status: 503 },
    );
  }
  if (prior?.object_key && prior.object_key !== objectKey)
    await env.BUCKET.delete(prior.object_key).catch(() => undefined);
  return NextResponse.json(
    { saved: true, profileImageUrl: `/api/account/profile-image/${user.id}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getSiteUserSession();
  if (!user)
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 },
    );
  const image = await env.DB.prepare(
    "SELECT object_key FROM site_user_profile_images WHERE user_id=? LIMIT 1",
  )
    .bind(user.id)
    .first<{ object_key: string }>();
  if (!image)
    return NextResponse.json(
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  await env.DB.prepare("DELETE FROM site_user_profile_images WHERE user_id=?")
    .bind(user.id)
    .run();
  await env.BUCKET.delete(image.object_key).catch(() => undefined);
  return NextResponse.json(
    { deleted: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
