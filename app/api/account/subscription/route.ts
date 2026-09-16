import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { createSubscriptionRequest, latestSubscriptionForUser, publicSubscription, subscriptionCatalog } from "../../../lib/home-subscriptions";
import { getSiteUserSession } from "../../../lib/site-user-auth";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getSiteUserSession();
  if (!user) return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401, headers });
  try {
    const [subscription, catalog] = await Promise.all([latestSubscriptionForUser(user.id), subscriptionCatalog()]);
    return NextResponse.json({ user, subscription: publicSubscription(subscription), catalog }, { headers });
  } catch {
    return NextResponse.json({ error: "Багцын мэдээллийг уншиж чадсангүй." }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403, headers });
  const user = await getSiteUserSession();
  if (!user) return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401, headers });
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.length > 8_000) return NextResponse.json({ error: "Хүсэлт хэт урт байна." }, { status: 413, headers });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400, headers }); }
  try {
    const subscription = await createSubscriptionRequest({ user, organizationName: body.organizationName, planId: body.planId, durationValue: body.durationValue, durationUnit: body.durationUnit });
    return NextResponse.json({ saved: true, subscription: publicSubscription(subscription) }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Багцын хүсэлтийг хадгалж чадсангүй." }, { status: 400, headers });
  }
}
