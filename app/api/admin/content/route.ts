import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission, type AdminPermission } from "../../../lib/site-admin";

const allowedKeys = ["pricing", "partners", "people"] as const;
const permissionByKey: Record<(typeof allowedKeys)[number], AdminPermission> = {
  pricing: "pricing.manage",
  partners: "partners.manage",
  people: "people.manage",
};

export async function PUT(request: Request) {
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const entries = allowedKeys.filter((key) => key in body);
  if (!entries.length || entries.some((key) => !Array.isArray(body[key]))) {
    return NextResponse.json({ error: "Хадгалах контентын бүтэц буруу байна." }, { status: 400 });
  }
  const deniedKey = entries.find((key) => !hasAdminPermission(user, permissionByKey[key]));
  if (deniedKey) {
    return NextResponse.json(
      { error: "Энэ хэсгийн мэдээллийг өөрчлөх эрх олгогдоогүй байна.", deniedKey },
      { status: 403 },
    );
  }
  const now = new Date().toISOString();
  const statements = entries.map((key) =>
    env.DB.prepare(
      `INSERT INTO site_content (key, value_json, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`,
    ).bind(key, JSON.stringify(body[key]), user.id, now),
  );
  await env.DB.batch(statements);
  return NextResponse.json({ saved: true, updatedAt: now });
}
