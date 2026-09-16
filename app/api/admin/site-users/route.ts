import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { maskPhone, purgeExpiredSiteUsers } from "../../../lib/site-user-auth";
import { confirmSubscriptionPayment, publicSubscription, queueProvisioningRetry, recordProvisioningResult, refreshExpiredSubscriptions } from "../../../lib/home-subscriptions";
import { dispatchProvisioning } from "../../../lib/eam-provisioning";

async function authorized() {
  const user = await getAdminSession();
  return user && hasAdminPermission(user, "accounts.manage") ? user : null;
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Веб хэрэглэгч удирдах эрхгүй байна." }, { status: 403 });
  await Promise.all([
    purgeExpiredSiteUsers().catch((error) => console.error("site_user_retention_cleanup_failed", error)),
    refreshExpiredSubscriptions().catch((error) => console.error("subscription_expiry_refresh_failed", error)),
  ]);
  const rows = await env.DB.prepare(
    `SELECT u.id,u.full_name,u.email,u.phone_e164,u.phone_country_iso,u.account_status,u.email_status,u.email_verified_at,
     u.phone_status,u.last_login_at,u.deletion_requested_at,u.created_at,u.updated_at,
     s.id AS subscription_id,s.organization_name,s.plan_id,s.plan_name,s.plan_snapshot_json,s.duration_months,s.base_amount_mnt,s.discount_amount_mnt,s.final_amount_mnt,s.promotion_snapshot_json,s.payment_status,s.subscription_status,s.starts_at,s.ends_at,s.core_tenant_id,s.core_tenant_admin_id,s.core_workspace_url,s.provisioning_status,s.last_provisioning_attempt_at,s.provisioned_at,s.created_at AS subscription_created_at,s.updated_at AS subscription_updated_at
     FROM site_users u LEFT JOIN site_user_subscriptions s ON s.id=(SELECT id FROM site_user_subscriptions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1)
     ORDER BY u.created_at DESC LIMIT 250`,
  ).all<Record<string, string | number | null>>();
  const users = (rows.results || []).map((row) => ({
    id: row.id, fullName: row.full_name, email: row.email, phone: maskPhone(String(row.phone_e164 || "")),
    phoneCountryIso: row.phone_country_iso, accountStatus: row.account_status, emailStatus: row.email_status,
    emailVerifiedAt: row.email_verified_at, phoneStatus: row.phone_status, lastLoginAt: row.last_login_at,
    deletionRequestedAt: row.deletion_requested_at, createdAt: row.created_at, updatedAt: row.updated_at,
    subscription: row.subscription_id ? publicSubscription({ ...row, id: row.subscription_id, created_at: row.subscription_created_at, updated_at: row.subscription_updated_at }) : null,
  }));
  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "Вэб хэрэглэгчийн төлөв өөрчлөх эрхгүй байна." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: string; action?: string; subscriptionId?: string };
  if (["confirm_payment", "retry_provisioning"].includes(body.action || "")) {
    if (!body.subscriptionId) return NextResponse.json({ error: "Багцын хүсэлт сонгоно уу." }, { status: 400 });
    try {
      const queued = body.action === "confirm_payment"
        ? await confirmSubscriptionPayment(body.subscriptionId, { id: admin.id, type: "admin" })
        : await queueProvisioningRetry(body.subscriptionId, { id: admin.id, type: "admin" });
      const dispatch = await dispatchProvisioning(env as unknown as { IBEX_EAM_PROVISIONING_URL?: string; IBEX_EAM_PROVISIONING_TOKEN?: string }, queued.payload);
      await recordProvisioningResult({ subscriptionId: queued.subscriptionId, outboxId: queued.outboxId, status: dispatch.status, response: dispatch.response, actorId: admin.id });
      return NextResponse.json({ updated: true, provisioningStatus: dispatch.status, message: dispatch.status === "accepted" ? "iBeX eAM тенант бэлтгэх хүсэлтийг хүлээн авлаа." : dispatch.status === "pending_connection" ? "iBeX eAM холболт тохируулаагүй тул хүсэлт дараалалд хадгалагдлаа." : "iBeX eAM руу илгээхэд алдаа гарлаа. Дахин илгээж болно." });
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Багцын төлөвийг шинэчилж чадсангүй." }, { status: 409 }); }
  }
  if (!body.id || !["active", "limited", "suspended", "deactivated"].includes(body.status || "")) return NextResponse.json({ error: "Хэрэглэгч эсвэл төлөв буруу байна." }, { status: 400 });
  const target = await env.DB.prepare("SELECT email_status FROM site_users WHERE id=? LIMIT 1").bind(body.id).first<{ email_status: string }>();
  if (!target) return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  if (["active", "limited"].includes(body.status || "") && target.email_status !== "verified") return NextResponse.json({ error: "И-мэйл баталгаажаагүй хэрэглэгчийг идэвхжүүлэх боломжгүй." }, { status: 409 });
  const now = new Date().toISOString(), statements = [env.DB.prepare("UPDATE site_users SET account_status=?,updated_at=? WHERE id=?").bind(body.status, now, body.id)];
  if (["suspended", "deactivated"].includes(body.status || "")) statements.push(env.DB.prepare("UPDATE site_user_sessions SET status='admin_revoked',revoked_at=? WHERE user_id=? AND status='active'").bind(now, body.id));
  await env.DB.batch(statements);
  return NextResponse.json({ updated: true, status: body.status });
}
