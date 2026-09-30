import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  RESET_TOKEN_MAX_AGE_MS,
  actionAttemptKey,
  actionIsLocked,
  clearActionFailures,
  createSecretToken,
  digest,
  findSiteUserByEmail,
  normalizeEmail,
  recordActionFailure,
} from "../../../lib/site-user-auth";
import { sendAccountEmail, verifyTurnstile } from "../../../lib/transactional-email";
import { readJsonObject } from "../../../lib/http-input";

const generic = { accepted: true, message: "И-мэйл бүртгэлтэй бол нууц үг сэргээх заавар илгээнэ." };

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const parsedBody = await readJsonObject<{ email?: string; turnstileToken?: string }>(request, 8_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
  const email = normalizeEmail(body.email);
  const turnstile = await verifyTurnstile(request, body.turnstileToken);
  if (!turnstile.ok) return NextResponse.json(
    { error: turnstile.configured ? "Аюулгүй байдлын шалгалт амжилтгүй боллоо." : "Нууц үг сэргээх хамгаалалт сервер дээр тохируулагдаагүй байна." },
    { status: turnstile.configured ? 400 : 503 },
  );
  const key = await actionAttemptKey(request, "password_reset", email || "invalid");
  if (await actionIsLocked(key)) return NextResponse.json({ error: "Олон хүсэлт илэрлээ. Түр хүлээгээд дахин оролдоно уу." }, { status: 429 });
  await recordActionFailure(key, 5, 60);
  const user = email ? await findSiteUserByEmail(email) : null;
  if (!user || user.email_status !== "verified" || !["active", "limited"].includes(user.account_status)) {
    return NextResponse.json(generic, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
  const token = createSecretToken();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE site_user_tokens SET status='invalidated' WHERE user_id=? AND purpose='password_reset' AND status='pending'").bind(user.id),
    env.DB.prepare(
      "INSERT INTO site_user_tokens (id,user_id,purpose,email_value,token_hash,status,expires_at,created_at) VALUES (?,?,'password_reset',?,?,'pending',?,?)",
    ).bind(crypto.randomUUID(), user.id, user.email, await digest(token), new Date(Date.now() + RESET_TOKEN_MAX_AGE_MS).toISOString(), now),
  ]);
  const resetUrl = new URL("/reset-password", request.url);
  resetUrl.searchParams.set("token", token);
  const delivery = await sendAccountEmail({ userId: user.id, email: user.email, name: user.full_name, locale: user.locale, template: "password_reset", actionUrl: resetUrl.toString() });
  await clearActionFailures(key);
  return NextResponse.json({ ...generic, emailSent: delivery.sent }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
