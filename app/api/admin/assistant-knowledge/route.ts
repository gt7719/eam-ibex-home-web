import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { defaultKnowledge, normalizeKnowledge, readKnowledge } from "../../../lib/assistant-knowledge";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";

export async function GET() {
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "knowledge.manage")) {
    return NextResponse.json({ error: "Мэдлэгийн сан харах эрх олгогдоогүй байна." }, { status: 403 });
  }
  const payload = await readKnowledge();
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "knowledge.manage")) {
    return NextResponse.json({ error: "Мэдлэгийн сан өөрчлөх эрх олгогдоогүй байна." }, { status: 403 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const entries = normalizeKnowledge((raw as { entries?: unknown })?.entries);
  if (!entries.length || entries.length > 250) {
    return NextResponse.json({ error: "Мэдлэгийн сангийн жагсаалт хоосон эсвэл хэт олон байна." }, { status: 400 });
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_content (key, value_json, updated_by, updated_at)
     VALUES ('assistantKnowledge', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
     updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  ).bind(JSON.stringify(entries), user.id, now).run();
  return NextResponse.json({ saved: true, updatedAt: now, entries });
}

export async function DELETE() {
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "knowledge.manage")) {
    return NextResponse.json({ error: "Мэдлэгийн сан өөрчлөх эрх олгогдоогүй байна." }, { status: 403 });
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_content (key, value_json, updated_by, updated_at)
     VALUES ('assistantKnowledge', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
     updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  ).bind(JSON.stringify(defaultKnowledge), user.id, now).run();
  return NextResponse.json({ reset: true, updatedAt: now, entries: defaultKnowledge });
}
