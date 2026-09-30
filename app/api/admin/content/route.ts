import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission, type AdminPermission } from "../../../lib/site-admin";
import { conflictMessage, hasTrustedOrigin, normalizePartners, normalizePeople } from "../../../lib/admin-security";
import { readJsonObject } from "../../../lib/http-input";

const allowedKeys = ["pricing", "partners", "people"] as const;
const permissionByKey: Record<(typeof allowedKeys)[number], AdminPermission> = {
  pricing: "pricing.manage",
  partners: "partners.manage",
  people: "people.manage",
};

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  const parsedBody = await readJsonObject<Record<string, unknown> & { revisions?: Record<string, string | null> }>(request, 512_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
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
  if (entries.includes('pricing')) {
    return NextResponse.json({error:'Үнийг багцын шаталсан тохиргооноос ноорог үүсгэн нийтэлнэ үү.'},{status:409});
  }
  if (entries.length !== 1) {
    return NextResponse.json({ error: "Нэг удаад зөвхөн одоо нээлттэй хэсгийг хадгална уу." }, { status: 400 });
  }
  try {
    const key = entries[0];
    const normalized = key === "partners" ? normalizePartners(body[key]) : normalizePeople(body[key]);
    const expected = body.revisions?.[key] ?? null;
    const revision = new Date().toISOString();
    const value = JSON.stringify(normalized);
    const write = expected === null
      ? env.DB.prepare("INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING").bind(key, value, user.id, revision)
      : env.DB.prepare("UPDATE site_content SET key=?,value_json=?,updated_by=?,updated_at=? WHERE key=? AND updated_at=?").bind(key, value, user.id, revision, key, expected);
    const [result] = await env.DB.batch([write]);
    const changes = result.meta?.changes;
    if (changes !== undefined ? Number(changes) !== 1 : result.success === false) return NextResponse.json({ error: conflictMessage() }, { status: 409 });
    return NextResponse.json({ saved: true, updatedAt: revision, revisions: { [key]: revision } });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Контентын бүтэц буруу байна." }, { status: 400 });
  }
}
