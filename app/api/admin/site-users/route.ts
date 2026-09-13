import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { maskPhone } from "../../../lib/site-user-auth";

async function authorized() {
  const user = await getAdminSession();
  return user && hasAdminPermission(user, "accounts.manage") ? user : null;
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Веб хэрэглэгч удирдах эрхгүй байна." }, { status: 403 });
  const rows = await env.DB.prepare(
    `SELECT id,full_name,email,phone_e164,phone_country_iso,account_status,email_status,email_verified_at,
     phone_status,last_login_at,deletion_requested_at,created_at,updated_at
     FROM site_users ORDER BY created_at DESC LIMIT 250`,
  ).all<Record<string, string | null>>();
  const users = (rows.results || []).map((row) => ({
    id: row.id, fullName: row.full_name, email: row.email, phone: maskPhone(row.phone_e164 || ""),
    phoneCountryIso: row.phone_country_iso, accountStatus: row.account_status, emailStatus: row.email_status,
    emailVerifiedAt: row.email_verified_at, phoneStatus: row.phone_status, lastLoginAt: row.last_login_at,
    deletionRequestedAt: row.deletion_requested_at, createdAt: row.created_at, updatedAt: row.updated_at,
  }));
  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  if (!await authorized()) return NextResponse.json({ error: "Веб хэрэглэгчийн төлөв өөрчлөх эрхгүй байна." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: string };
  if (!body.id || !["active", "limited", "suspended", "deactivated"].includes(body.status || "")) {
    return NextResponse.json({ error: "Хэрэглэгч эсвэл төлөв буруу байна." }, { status: 400 });
  }
  const target = await env.DB.prepare("SELECT email_status FROM site_users WHERE id=? LIMIT 1").bind(body.id).first<{ email_status: string }>();
  if (!target) return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  if (["active", "limited"].includes(body.status || "") && target.email_status !== "verified") {
    return NextResponse.json({ error: "И-мэйл баталгаажаагүй хэрэглэгчийг идэвхжүүлэх боломжгүй." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const statements = [env.DB.prepare("UPDATE site_users SET account_status=?,updated_at=? WHERE id=?").bind(body.status, now, body.id)];
  if (["suspended", "deactivated"].includes(body.status || "")) statements.push(env.DB.prepare("UPDATE site_user_sessions SET status='admin_revoked',revoked_at=? WHERE user_id=? AND status='active'").bind(now, body.id));
  await env.DB.batch(statements);
  return NextResponse.json({ updated: true, status: body.status });
}
