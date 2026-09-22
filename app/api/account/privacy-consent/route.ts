import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getSiteUserSession, PRIVACY_VERSION } from "../../../lib/site-user-auth";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403, headers });
  const user = await getSiteUserSession();
  if (!user) return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401, headers });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE site_users SET privacy_version=?,privacy_accepted_at=?,updated_at=? WHERE id=?")
      .bind(PRIVACY_VERSION, now, now, user.id),
    env.DB.prepare("INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,?,'accepted','home_ai_notice',?)")
      .bind(crypto.randomUUID(), user.id, "privacy", PRIVACY_VERSION, now),
  ]);
  return NextResponse.json({ accepted: true, version: PRIVACY_VERSION, acceptedAt: now }, { headers });
}
