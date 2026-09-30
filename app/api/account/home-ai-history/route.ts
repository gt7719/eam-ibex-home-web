import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { clearHomeAiHistory, readHomeAiHistory } from "../../../lib/home-ai-history";
import { getSiteUserSession } from "../../../lib/site-user-auth";
import { readHomeAiSettings } from "../../../lib/home-ai-control";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getSiteUserSession();
  if (!user) return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401, headers });
  const { settings } = await readHomeAiSettings(env.DB);
  const messages = await readHomeAiHistory(env.DB, user.id, settings.historyRetentionDays);
  return NextResponse.json({
    messages,
    privacyCurrent: user.privacyCurrent,
    requiredPrivacyVersion: user.requiredPrivacyVersion,
    retentionDays: settings.historyRetentionDays,
  }, { headers });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403, headers });
  const user = await getSiteUserSession();
  if (!user) return NextResponse.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401, headers });
  await clearHomeAiHistory(env.DB, user.id);
  return NextResponse.json({ cleared: true }, { headers });
}
