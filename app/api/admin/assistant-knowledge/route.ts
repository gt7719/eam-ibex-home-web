import { NextResponse } from "next/server";
import { defaultKnowledge, normalizeKnowledge, readKnowledge } from "../../../lib/assistant-knowledge";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { conflictMessage, hasTrustedOrigin, safeHttpsUrl, saveContentWithRevision } from "../../../lib/admin-security";

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
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
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
  const body = raw as { entries?: unknown; revision?: string | null };
  const suppliedEntries = Array.isArray(body.entries) ? body.entries as Array<Record<string, unknown>> : [];
  if (suppliedEntries.some((entry) => entry.sourceUrl && safeHttpsUrl(entry.sourceUrl) === null)) {
    return NextResponse.json({ error: "Эх сурвалжийн холбоос HTTPS байх ёстой." }, { status: 400 });
  }
  const entries = normalizeKnowledge(body.entries);
  if (!entries.length || entries.length > 250) {
    return NextResponse.json({ error: "Мэдлэгийн сангийн жагсаалт хоосон эсвэл хэт олон байна." }, { status: 400 });
  }
  const revision = await saveContentWithRevision({ key: "assistantKnowledge", value: entries, userId: user.id, expectedRevision: body.revision ?? null });
  if (!revision) return NextResponse.json({ error: conflictMessage() }, { status: 409 });
  return NextResponse.json({ saved: true, updatedAt: revision, revision, entries });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "knowledge.manage")) {
    return NextResponse.json({ error: "Мэдлэгийн сан өөрчлөх эрх олгогдоогүй байна." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as { revision?: string | null };
  const revision = await saveContentWithRevision({ key: "assistantKnowledge", value: defaultKnowledge, userId: user.id, expectedRevision: body.revision ?? null });
  if (!revision) return NextResponse.json({ error: conflictMessage() }, { status: 409 });
  return NextResponse.json({ reset: true, updatedAt: revision, revision, entries: defaultKnowledge });
}
