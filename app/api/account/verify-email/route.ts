import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { digest } from "../../../lib/site-user-auth";
import { accountStatusAfterVerification } from "../../../lib/site-user-verification";
import { readJsonObject } from "../../../lib/http-input";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const parsedBody = await readJsonObject<{ token?: string }>(request, 4_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
  if (!body.token || !/^[a-f0-9]{64}$/.test(body.token)) {
    return NextResponse.json(
      { verified: false, status: "invalid" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    "SELECT id,user_id,status,expires_at FROM site_user_tokens WHERE token_hash=? AND purpose='verify_email' LIMIT 1",
  )
    .bind(await digest(body.token))
    .first<{
      id: string;
      user_id: string;
      status: string;
      expires_at: string;
    }>();
  if (!row || row.status !== "pending")
    return NextResponse.json(
      { verified: false, status: row?.status || "invalid" },
      { status: 400 },
    );
  if (row.expires_at <= now) {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE site_user_tokens SET status='expired' WHERE id=?",
      ).bind(row.id),
      env.DB.prepare(
        "UPDATE site_users SET email_status='expired',updated_at=? WHERE id=?",
      ).bind(now, row.user_id),
    ]);
    return NextResponse.json(
      { verified: false, status: "expired" },
      { status: 410 },
    );
  }
  const user = await env.DB.prepare(
    "SELECT account_status,email_status,phone_status,email_verification_required,phone_verification_required FROM site_users WHERE id=? LIMIT 1",
  )
    .bind(row.user_id)
    .first<{
      account_status: string;
      email_status: string;
      phone_status: string;
      email_verification_required: number;
      phone_verification_required: number;
    }>();
  if (!user)
    return NextResponse.json(
      { verified: false, status: "invalid" },
      { status: 400 },
    );
  const accountStatus = accountStatusAfterVerification(
    {
      emailStatus: "verified",
      phoneStatus: user.phone_status,
      emailRequired: user.email_verification_required,
      phoneRequired: user.phone_verification_required,
    },
    user.account_status,
  );
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE site_user_tokens SET status='used',used_at=? WHERE id=? AND status='pending'",
    ).bind(now, row.id),
    env.DB.prepare(
      "UPDATE site_users SET email_status='verified',email_verified_at=?,account_status=?,updated_at=? WHERE id=?",
    ).bind(now, accountStatus, now, row.user_id),
    env.DB.prepare(
      "UPDATE site_user_tokens SET status='invalidated' WHERE user_id=? AND purpose='verify_email' AND id!=? AND status='pending'",
    ).bind(row.user_id, row.id),
  ]);
  return NextResponse.json(
    {
      verified: true,
      status: "verified",
      phoneVerificationRequired: Boolean(user.phone_verification_required),
      accountStatus,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
