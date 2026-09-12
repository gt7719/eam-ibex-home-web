import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { cloneDefaultNavigation, normalizeNavigation } from "../../../lib/navigation";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";

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
  });
}

export async function PUT(request: Request) {
  const user = await authorizedAdmin();
  if (!user) return NextResponse.json({ error: "Толгой цэсний мэдээлэл удирдах эрхгүй байна." }, { status: 403 });
  let body: { action?: "draft" | "publish"; navigation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const navigation = normalizeNavigation(body.navigation);
  if (!navigation || (body.action !== "draft" && body.action !== "publish")) {
    return NextResponse.json({ error: "Цэсийн мэдээлэл дутуу эсвэл буруу байна." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const value = JSON.stringify(navigation);
  const upsert = (key: string) => env.DB.prepare(
    `INSERT INTO site_content (key, value_json, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
       updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  ).bind(key, value, user.id, now);
  if (body.action === "publish") {
    await env.DB.batch([upsert("headerNavigationDraft"), upsert("headerNavigation")]);
  } else {
    await upsert("headerNavigationDraft").run();
  }
  return NextResponse.json({ saved: true, published: body.action === "publish", updatedAt: now, navigation });
}
