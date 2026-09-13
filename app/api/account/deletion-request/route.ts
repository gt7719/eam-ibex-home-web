import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getSiteUserSession } from "../../../lib/site-user-auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getSiteUserSession();
  if (!user) return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE site_users SET account_status='deletion_requested',deletion_requested_at=?,updated_at=? WHERE id=?").bind(now, now, user.id),
    env.DB.prepare("UPDATE site_user_sessions SET status='admin_revoked',revoked_at=? WHERE user_id=? AND status='active'").bind(now, user.id),
  ]);
  return NextResponse.json({ requested: true, purgeAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
}
