import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import {
  hasTrustedOrigin,
  saveContentWithRevision,
} from "../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { maskPhone, purgeExpiredSiteUsers } from "../../../lib/site-user-auth";
import {
  accountStatusAfterVerification,
  normalizeVerificationPolicy,
  readSiteUserVerificationPolicy,
  SITE_USER_VERIFICATION_POLICY_KEY,
  verificationIsComplete,
  verificationSummary,
} from "../../../lib/site-user-verification";
import {
  profileCompleteness,
  profileImageUrl,
} from "../../../lib/site-user-profile";
import {
  confirmSubscriptionPayment,
  publicSubscription,
  queueProvisioningRetry,
  recordProvisioningResult,
  refreshExpiredSubscriptions,
} from "../../../lib/home-subscriptions";
import { dispatchProvisioning } from "../../../lib/eam-provisioning";

async function authorized() {
  const user = await getAdminSession();
  return user && hasAdminPermission(user, "accounts.manage") ? user : null;
}

type UserRow = Record<string, string | number | null>;
type VerificationRuntimeEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  IBEX_SMS_DELIVERY_URL?: string;
  IBEX_SMS_DELIVERY_TOKEN?: string;
  IBEX_SMS_FROM?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

function verificationReadiness() {
  const runtime = env as unknown as VerificationRuntimeEnv;
  let smsEndpointValid = false;
  try {
    smsEndpointValid = new URL(runtime.IBEX_SMS_DELIVERY_URL || "").protocol === "https:";
  } catch {
    smsEndpointValid = false;
  }
  const emailReady = Boolean(runtime.RESEND_API_KEY?.trim());
  const smsReady = Boolean(smsEndpointValid && runtime.IBEX_SMS_DELIVERY_TOKEN?.trim());
  const turnstileReady = Boolean(runtime.TURNSTILE_SITE_KEY?.trim() && runtime.TURNSTILE_SECRET_KEY?.trim());
  return {
    email: {
      ready: emailReady,
      provider: "Resend",
      sender: runtime.EMAIL_FROM?.trim() || "iBeX Account <no-reply@account.ibex.mn>",
      replyTo: runtime.EMAIL_REPLY_TO?.trim() || "support@ibex.mn",
    },
    sms: {
      ready: smsReady,
      provider: "HTTPS SMS connector",
      sender: runtime.IBEX_SMS_FROM?.trim() || "iBeX",
      endpointConfigured: smsEndpointValid,
    },
    turnstile: { ready: turnstileReady },
    limits: {
      otpExpiresMinutes: 10,
      resendCooldownSeconds: 60,
      dailySendLimit: 5,
      maximumAttempts: 5,
      emailLinkExpiresHours: 24,
    },
  };
}

function publicUser(row: UserRow) {
  const subscription = row.subscription_id
    ? publicSubscription({
        ...row,
        id: row.subscription_id,
        created_at: row.subscription_created_at,
        updated_at: row.subscription_updated_at,
      })
    : null;
  const profile = profileCompleteness({
    fullName: String(row.full_name || ""),
    email: String(row.email || ""),
    phoneE164: String(row.phone_e164 || ""),
    locale: String(row.locale || ""),
    organizationName: subscription?.organizationName || "",
    hasProfileImage: Boolean(row.profile_image_id),
  });
  const verification = verificationSummary({
    emailStatus: String(row.email_status || ""),
    phoneStatus: String(row.phone_status || ""),
    emailRequired: Number(row.email_verification_required || 0),
    phoneRequired: Number(row.phone_verification_required || 0),
  });
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: maskPhone(String(row.phone_e164 || "")),
    phoneCountryIso: row.phone_country_iso,
    accountStatus: row.account_status,
    emailStatus: row.email_status,
    emailVerifiedAt: row.email_verified_at,
    phoneStatus: row.phone_status,
    phoneVerifiedAt: row.phone_verified_at,
    emailVerificationRequired: Boolean(row.email_verification_required),
    phoneVerificationRequired: Boolean(row.phone_verification_required),
    locale: row.locale,
    lastLoginAt: row.last_login_at,
    deletionRequestedAt: row.deletion_requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      ...profile,
      hasProfileImage: Boolean(row.profile_image_id),
      profileImageUrl: row.profile_image_id
        ? profileImageUrl(String(row.id))
        : null,
    },
    verification,
    subscription,
  };
}

export async function GET() {
  if (!(await authorized()))
    return NextResponse.json(
      { error: "Веб хэрэглэгч удирдах эрхгүй байна." },
      { status: 403 },
    );
  await Promise.all([
    purgeExpiredSiteUsers().catch((error) =>
      console.error("site_user_retention_cleanup_failed", error),
    ),
    refreshExpiredSubscriptions().catch((error) =>
      console.error("subscription_expiry_refresh_failed", error),
    ),
  ]);
  const [rows, verificationPolicy, deliveryRows] = await Promise.all([
    env.DB.prepare(
      `SELECT u.id,u.full_name,u.email,u.phone_e164,u.phone_country_iso,u.account_status,u.email_status,u.email_verified_at,
       u.phone_status,u.phone_verified_at,u.email_verification_required,u.phone_verification_required,u.locale,u.last_login_at,u.deletion_requested_at,u.created_at,u.updated_at,
       i.id AS profile_image_id,
       s.id AS subscription_id,s.organization_name,s.plan_id,s.plan_name,s.plan_snapshot_json,s.duration_months,s.base_amount_mnt,s.discount_amount_mnt,s.final_amount_mnt,s.promotion_snapshot_json,s.payment_status,s.subscription_status,s.starts_at,s.ends_at,s.core_tenant_id,s.core_tenant_admin_id,s.core_workspace_url,s.provisioning_status,s.last_provisioning_attempt_at,s.provisioned_at,s.created_at AS subscription_created_at,s.updated_at AS subscription_updated_at
       FROM site_users u
       LEFT JOIN site_user_profile_images i ON i.user_id=u.id
       LEFT JOIN site_user_subscriptions s ON s.id=(SELECT id FROM site_user_subscriptions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1)
       ORDER BY u.created_at DESC LIMIT 250`,
    ).all<UserRow>(),
    readSiteUserVerificationPolicy(),
    env.DB.prepare(
      `SELECT e.channel,e.template,e.recipient_masked,e.provider,e.status,e.error_code,e.attempt_count,e.created_at,e.updated_at,
       u.full_name AS user_name
       FROM auth_delivery_events e
       LEFT JOIN site_users u ON u.id=e.user_id
       ORDER BY e.created_at DESC LIMIT 100`,
    ).all<Record<string, string | number | null>>(),
  ]);
  return NextResponse.json(
    {
      users: (rows.results || []).map(publicUser),
      verificationPolicy,
      verificationReadiness: verificationReadiness(),
      deliveries: deliveryRows.results || [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const admin = await authorized();
  if (!admin)
    return NextResponse.json(
      { error: "Вэб хэрэглэгчийн төлөв өөрчлөх эрхгүй байна." },
      { status: 403 },
    );
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    action?: string;
    subscriptionId?: string;
    verificationPolicy?: unknown;
    expectedRevision?: string | null;
  };

  if (body.action === "save_verification_policy") {
    const policy = normalizeVerificationPolicy(body.verificationPolicy);
    const readiness = verificationReadiness();
    if (policy.emailRequired && !readiness.email.ready)
      return NextResponse.json(
        { error: "И-мэйл үйлчилгээ бэлэн болоогүй тул и-мэйл баталгаажуулалтыг шаардах боломжгүй байна." },
        { status: 409 },
      );
    if (policy.phoneRequired && !readiness.sms.ready)
      return NextResponse.json(
        { error: "SMS үйлчилгээ бэлэн болоогүй тул утасны баталгаажуулалтыг шаардах боломжгүй байна." },
        { status: 409 },
      );
    const saved = await saveContentWithRevision({
      key: SITE_USER_VERIFICATION_POLICY_KEY,
      value: policy,
      userId: admin.id,
      expectedRevision: body.expectedRevision ?? null,
    });
    if (!saved)
      return NextResponse.json(
        {
          error:
            "Өөр админ баталгаажуулалтын бодлогыг шинэчилсэн байна. Хуудсыг дахин ачаална уу.",
        },
        { status: 409 },
      );
    const now = new Date().toISOString();
    const reconciled = await env.DB.prepare(
      `UPDATE site_users
       SET email_verification_required=?,
           phone_verification_required=?,
           account_status=CASE
             WHEN (?=0 OR email_status='verified')
              AND (?=0 OR phone_status='verified') THEN 'active'
             WHEN ?=1 AND email_status<>'verified' THEN 'pending'
             ELSE 'limited'
           END,
           updated_at=?
       WHERE account_status IN ('pending','limited')`,
    )
      .bind(
        policy.emailRequired ? 1 : 0,
        policy.phoneRequired ? 1 : 0,
        policy.emailRequired ? 1 : 0,
        policy.phoneRequired ? 1 : 0,
        policy.emailRequired ? 1 : 0,
        now,
      )
      .run();
    return NextResponse.json({
      updated: true,
      reconciledUsers: Number(reconciled.meta?.changes || 0),
      verificationPolicy: { ...policy, revision: saved },
    });
  }

  if (["confirm_payment", "retry_provisioning"].includes(body.action || "")) {
    if (!body.subscriptionId)
      return NextResponse.json(
        { error: "Багцын хүсэлт сонгоно уу." },
        { status: 400 },
      );
    try {
      const queued =
        body.action === "confirm_payment"
          ? await confirmSubscriptionPayment(body.subscriptionId, {
              id: admin.id,
              type: "admin",
            })
          : await queueProvisioningRetry(body.subscriptionId, {
              id: admin.id,
              type: "admin",
            });
      const dispatch = await dispatchProvisioning(
        env as unknown as {
          IBEX_EAM_PROVISIONING_URL?: string;
          IBEX_EAM_PROVISIONING_TOKEN?: string;
        },
        queued.payload,
      );
      await recordProvisioningResult({
        subscriptionId: queued.subscriptionId,
        outboxId: queued.outboxId,
        status: dispatch.status,
        response: dispatch.response,
        actorId: admin.id,
      });
      return NextResponse.json({
        updated: true,
        provisioningStatus: dispatch.status,
        message:
          dispatch.status === "accepted"
            ? "iBeX eAM тенант бэлтгэх хүсэлтийг хүлээн авлаа."
            : dispatch.status === "pending_connection"
              ? "iBeX eAM холболт тохируулаагүй тул хүсэлт дараалалд хадгалагдлаа."
              : "iBeX eAM руу илгээхэд алдаа гарлаа. Дахин илгээж болно.",
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Багцын төлөвийг шинэчилж чадсангүй.",
        },
        { status: 409 },
      );
    }
  }

  if (
    !body.id ||
    !["active", "limited", "suspended", "deactivated"].includes(
      body.status || "",
    )
  )
    return NextResponse.json(
      { error: "Хэрэглэгч эсвэл төлөв буруу байна." },
      { status: 400 },
    );
  const target = await env.DB.prepare(
    "SELECT account_status,email_status,phone_status,email_verification_required,phone_verification_required FROM site_users WHERE id=? LIMIT 1",
  )
    .bind(body.id)
    .first<{
      account_status: string;
      email_status: string;
      phone_status: string;
      email_verification_required: number;
      phone_verification_required: number;
    }>();
  if (!target)
    return NextResponse.json(
      { error: "Хэрэглэгч олдсонгүй." },
      { status: 404 },
    );
  const emailVerificationMissing =
    target.email_status !== "verified" && target.email_verification_required === 1;
  if (
    ["active", "limited"].includes(body.status || "") &&
    (emailVerificationMissing ||
      !verificationIsComplete({
        emailStatus: target.email_status,
        phoneStatus: target.phone_status,
        emailRequired: target.email_verification_required,
        phoneRequired: target.phone_verification_required,
      }))
  )
    return NextResponse.json(
      {
        error:
          "Энэ хэрэглэгчийн системээс шаардах баталгаажуулалт дуусаагүй байна.",
      },
      { status: 409 },
    );
  const nextStatus =
    body.status === "active" || body.status === "limited"
      ? accountStatusAfterVerification(
          {
            emailStatus: target.email_status,
            phoneStatus: target.phone_status,
            emailRequired: target.email_verification_required,
            phoneRequired: target.phone_verification_required,
          },
          String(body.status),
        )
      : body.status;
  const now = new Date().toISOString(),
    statements = [
      env.DB.prepare(
        "UPDATE site_users SET account_status=?,updated_at=? WHERE id=?",
      ).bind(nextStatus, now, body.id),
    ];
  if (["suspended", "deactivated"].includes(nextStatus))
    statements.push(
      env.DB.prepare(
        "UPDATE site_user_sessions SET status='admin_revoked',revoked_at=? WHERE user_id=? AND status='active'",
      ).bind(now, body.id),
    );
  await env.DB.batch(statements);
  return NextResponse.json({ updated: true, status: nextStatus });
}
