import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";

type SecurityEnv = {
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export async function GET() {
  const runtime = env as unknown as SecurityEnv;
  const siteKey = runtime.TURNSTILE_SITE_KEY?.trim();
  const enabled = Boolean(siteKey && runtime.TURNSTILE_SECRET_KEY?.trim());
  return NextResponse.json(
    { enabled, siteKey: enabled ? siteKey : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
