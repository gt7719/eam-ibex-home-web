import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { digest } from "../../../lib/site-user-auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { token?: string };
  if (!body.token || !/^[a-f0-9]{64}$/.test(body.token)) {
    return NextResponse.json({ verified: false, status: "invalid" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    "SELECT id,user_id,status,expires_at FROM site_user_tokens WHERE token_hash=? AND purpose='verify_email' LIMIT 1",
  ).bind(await digest(body.token)).first<{ id: string; user_id: string; status: string; expires_at: string }>();
  if (!row || row.status !== "pending") return NextResponse.json({ verified: false, status: row?.status || "invalid" }, { status: 400 });
  if (row.expires_at <= now) {
    await env.DB.batch([
      env.DB.prepare("UPDATE site_user_tokens SET status='expired' WHERE id=?").bind(row.id),
      env.DB.prepare("UPDATE site_users SET email_status='expired',updated_at=? WHERE id=?").bind(now, row.user_id),
    ]);
    return NextResponse.json({ verified: false, status: "expired" }, { status: 410 });
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE site_user_tokens SET status='used',used_at=? WHERE id=? AND status='pending'").bind(now, row.id),
    env.DB.prepare(
      "UPDATE site_users SET email_status='verified',email_verified_at=?,account_status=CASE WHEN account_status='pending' THEN 'active' ELSE account_status END,updated_at=? WHERE id=?",
    ).bind(now, now, row.user_id),
    env.DB.prepare("UPDATE site_user_tokens SET status='invalidated' WHERE user_id=? AND purpose='verify_email' AND id!=? AND status='pending'").bind(row.user_id, row.id),
  ]);
  return NextResponse.json({ verified: true, status: "verified" }, { headers: { "Cache-Control": "no-store" } });
}
