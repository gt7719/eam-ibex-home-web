import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { cloneDefaultNavigation, normalizeNavigation } from "../../../lib/navigation";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { conflictMessage, hasTrustedOrigin, saveContentWithRevision } from "../../../lib/admin-security";

type ContentRow = { key: string; value_json: string; updated_at: string };

async function authorizedAdmin() {
  const user = await getAdminSession();
  return user && hasAdminPermission(user, "navigation.manage") ? user : null;
}

function parsedNavigation(row: ContentRow | undefined) {
  if (!row) return null;
  try {
    return normalizeNavigation(JSON.parse(row.value_json));
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await authorizedAdmin();
  if (!user) return NextResponse.json({ error: "Толгой цэсний мэдээлэл удирдах эрхгүй байна." }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT key, value_json, updated_at FROM site_content WHERE key IN ('headerNavigation', 'headerNavigationDraft')",
  ).all<ContentRow>();
  const byKey = new Map((rows.results || []).map((row) => [row.key, row]));
  const published = parsedNavigation(byKey.get("headerNavigation")) || cloneDefaultNavigation();
  const draft = parsedNavigation(byKey.get("headerNavigationDraft")) || published;
  return NextResponse.json({
    draft,
    published,
    draftUpdatedAt: byKey.get("headerNavigationDraft")?.updated_at || null,
    publishedUpdatedAt: byKey.get("headerNavigation")?.updated_at || null,
    canUploadMedia: hasAdminPermission(user, "media.upload"),
  });
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await authorizedAdmin();
  if (!user) return NextResponse.json({ error: "Толгой цэсний мэдээлэл удирдах эрхгүй байна." }, { status: 403 });
  let body: { action?: "draft" | "publish"; navigation?: unknown; revision?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const navigation = normalizeNavigation(body.navigation);
  if (!navigation || (body.action !== "draft" && body.action !== "publish")) {
    return NextResponse.json({ error: "Цэсийн мэдээлэл дутуу эсвэл буруу байна." }, { status: 400 });
  }
  const expectedRevision = body.revision ?? null;
  const value = JSON.stringify(navigation);
  if (body.action === "draft") {
    const revision = await saveContentWithRevision({ key: "headerNavigationDraft", value: navigation, userId: user.id, expectedRevision });
    if (!revision) return NextResponse.json({ error: conflictMessage() }, { status: 409 });
    return NextResponse.json({ saved: true, published: false, updatedAt: revision, revision, navigation });
  }
  const now = new Date().toISOString();
  const draftWrite = expectedRevision === null
    ? env.DB.prepare("INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING").bind("headerNavigationDraft", value, user.id, now)
    : env.DB.prepare("UPDATE site_content SET key=?,value_json=?,updated_by=?,updated_at=? WHERE key=? AND updated_at=?").bind("headerNavigationDraft", value, user.id, now, "headerNavigationDraft", expectedRevision);
  const publishWrite = env.DB.prepare(
    `INSERT INTO site_content (key,value_json,updated_by,updated_at)
     SELECT ?,?,?,? WHERE EXISTS (
       SELECT 1 FROM site_content WHERE key=? AND updated_at=? AND value_json=?
     ) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
  ).bind("headerNavigation", value, user.id, now, "headerNavigationDraft", now, value);
  const results = await env.DB.batch([draftWrite, publishWrite]);
  const changed = (result: { success?: boolean; meta?: { changes?: number } }) => result.meta?.changes === undefined ? result.success !== false : Number(result.meta.changes) === 1;
  if (!changed(results[0]) || !changed(results[1])) {
    return NextResponse.json({ error: conflictMessage() }, { status: 409 });
  }
  return NextResponse.json({ saved: true, published: body.action === "publish", updatedAt: now, revision: now, navigation });
}
