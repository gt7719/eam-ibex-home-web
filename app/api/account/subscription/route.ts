import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  createSubscriptionRequest,
  latestSubscriptionForUser,
  publicSubscription,
  subscriptionCatalog,
} from "../../../lib/home-subscriptions";
import { getSiteUserSession } from "../../../lib/site-user-auth";
import {
  profileCompleteness,
  profileImageUrl,
} from "../../../lib/site-user-profile";
import { verificationSummary } from "../../../lib/site-user-verification";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getSiteUserSession();
  if (!user)
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401, headers },
    );
  try {
    const [subscription, catalog, image] = await Promise.all([
      latestSubscriptionForUser(user.id),
      subscriptionCatalog(),
      env.DB.prepare(
        "SELECT id FROM site_user_profile_images WHERE user_id=? LIMIT 1",
      )
        .bind(user.id)
        .first<{ id: string }>(),
    ]);
    const profile = profileCompleteness({
      fullName: user.fullName,
      email: user.email,
      phoneE164: user.phoneE164,
      locale: user.locale,
      organizationName: subscription
        ? String(subscription.organization_name || "")
        : "",
      hasProfileImage: Boolean(image),
    });
    return NextResponse.json(
      {
        user: {
          ...user,
          profile: {
            ...profile,
            hasProfileImage: Boolean(image),
            profileImageUrl: image ? profileImageUrl(user.id) : null,
          },
          verification: verificationSummary({
            emailStatus: user.emailStatus,
            phoneStatus: user.phoneStatus,
            emailRequired: user.emailVerificationRequired,
            phoneRequired: user.phoneVerificationRequired,
          }),
        },
        subscription: publicSubscription(subscription),
        catalog,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Багцын мэдээллийг уншиж чадсангүй." },
      { status: 503, headers },
    );
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json(
      { error: "Origin mismatch" },
      { status: 403, headers },
    );
  const user = await getSiteUserSession();
  if (!user)
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401, headers },
    );
  if (user.accountStatus !== "active")
    return NextResponse.json(
      {
        error: "Багц сонгохын өмнө шаардлагатай баталгаажуулалтаа дуусгана уу.",
      },
      { status: 403, headers },
    );
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.length > 8_000)
      return NextResponse.json(
        { error: "Хүсэлт хэт урт байна." },
        { status: 413, headers },
      );
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Хүсэлтийн формат буруу байна." },
      { status: 400, headers },
    );
  }
  try {
    const subscription = await createSubscriptionRequest({
      user,
      organizationName: body.organizationName,
      planId: body.planId,
      durationValue: body.durationValue,
      durationUnit: body.durationUnit,
    });
    return NextResponse.json(
      { saved: true, subscription: publicSubscription(subscription) },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Багцын хүсэлтийг хадгалж чадсангүй.",
      },
      { status: 400, headers },
    );
  }
}
