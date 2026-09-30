import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import {
  getAdminSession,
  hasAdminPermission,
} from "../../../../lib/site-admin";
import { publicSubscription } from "../../../../lib/home-subscriptions";
import {
  profileCompleteness,
  profileImageUrl,
} from "../../../../lib/site-user-profile";
import { verificationSummary } from "../../../../lib/site-user-verification";

async function authorized() {
  const admin = await getAdminSession();
  return admin && hasAdminPermission(admin, "accounts.manage") ? admin : null;
}

function safeEventPayload(value: unknown) {
  if (typeof value !== "string" || value.length > 12_000) return null;
  try {
    const input = JSON.parse(value) as Record<string, unknown>;
    const visible = [
      "organizationName",
      "planId",
      "durationMonths",
      "amount",
      "startsAt",
      "endsAt",
      "outboxId",
      "tenantId",
      "tenantAdminId",
      "workspaceUrl",
    ];
    return Object.fromEntries(
      visible
        .filter(
          (key) =>
            typeof input[key] === "string" || typeof input[key] === "number",
        )
        .map((key) => [key, input[key]]),
    );
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await authorized()))
    return NextResponse.json(
      { error: "Вэб хэрэглэгч удирдах эрхгүй байна." },
      { status: 403 },
    );
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9-]{8,120}$/.test(id))
    return NextResponse.json(
      { error: "Хэрэглэгчийн таних тэмдэг буруу байна." },
      { status: 400 },
    );
  const user = await env.DB.prepare(
    `SELECT u.id,u.full_name,u.email,u.phone_e164,u.phone_country_iso,u.account_status,u.email_status,u.email_verified_at,u.phone_status,u.phone_verified_at,
      u.email_verification_required,u.phone_verification_required,u.locale,u.marketing_email_opt_in,u.marketing_sms_opt_in,u.security_sms_enabled,u.last_login_at,u.locked_until,u.deletion_requested_at,u.created_at,u.updated_at,
      i.id AS profile_image_id
      FROM site_users u LEFT JOIN site_user_profile_images i ON i.user_id=u.id WHERE u.id=? LIMIT 1`,
  )
    .bind(id)
    .first<Record<string, string | number | null>>();
  if (!user)
    return NextResponse.json(
      { error: "Хэрэглэгч олдсонгүй." },
      { status: 404 },
    );
  const [subscription, events, deliveries, outbox] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM site_user_subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
    )
      .bind(id)
      .first<Record<string, string | number | null>>(),
    env.DB.prepare(
      "SELECT event_type,actor_type,created_at,payload_json FROM site_user_subscription_events WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
    )
      .bind(id)
      .all<{
        event_type: string;
        actor_type: string;
        created_at: string;
        payload_json: string;
      }>(),
    env.DB.prepare(
      "SELECT channel,template,recipient_masked,provider,status,error_code,attempt_count,created_at,updated_at FROM auth_delivery_events WHERE user_id=? ORDER BY created_at DESC LIMIT 15",
    )
      .bind(id)
      .all<Record<string, string | number | null>>(),
    env.DB.prepare(
      "SELECT status,attempt_count,last_attempt_at,delivered_at,created_at,updated_at FROM site_user_provisioning_outbox WHERE subscription_id IN (SELECT id FROM site_user_subscriptions WHERE user_id=?) ORDER BY created_at DESC LIMIT 15",
    )
      .bind(id)
      .all<Record<string, string | number | null>>(),
  ]);
  const publicPlan = publicSubscription(subscription);
  const profile = profileCompleteness({
    fullName: String(user.full_name || ""),
    email: String(user.email || ""),
    phoneE164: String(user.phone_e164 || ""),
    locale: String(user.locale || ""),
    organizationName: publicPlan?.organizationName || "",
    hasProfileImage: Boolean(user.profile_image_id),
  });
  const verification = verificationSummary({
    emailStatus: String(user.email_status),
    phoneStatus: String(user.phone_status),
    emailRequired: Number(user.email_verification_required),
    phoneRequired: Number(user.phone_verification_required),
  });
  return NextResponse.json(
    {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneE164: user.phone_e164,
        phoneCountryIso: user.phone_country_iso,
        accountStatus: user.account_status,
        emailStatus: user.email_status,
        emailVerifiedAt: user.email_verified_at,
        phoneStatus: user.phone_status,
        phoneVerifiedAt: user.phone_verified_at,
        emailVerificationRequired: Boolean(user.email_verification_required),
        phoneVerificationRequired: Boolean(user.phone_verification_required),
        locale: user.locale,
        marketingEmailOptIn: Boolean(user.marketing_email_opt_in),
        marketingSmsOptIn: Boolean(user.marketing_sms_opt_in),
        securitySmsEnabled: Boolean(user.security_sms_enabled),
        lastLoginAt: user.last_login_at,
        deletionRequestedAt: user.deletion_requested_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        profile: {
          ...profile,
          hasProfileImage: Boolean(user.profile_image_id),
          profileImageUrl: user.profile_image_id
            ? profileImageUrl(String(user.id))
            : null,
        },
        verification,
      },
      subscription: publicPlan,
      events: (events.results || []).map((row) => ({
        eventType: row.event_type,
        actorType: row.actor_type,
        createdAt: row.created_at,
        payload: safeEventPayload(row.payload_json),
      })),
      deliveries: deliveries.results || [],
      provisioning: outbox.results || [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
