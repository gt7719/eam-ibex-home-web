import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  EMAIL_TOKEN_MAX_AGE_MS,
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

const generic = { accepted: true, message: "Бүртгэл байгаа бөгөөд баталгаажуулах шаардлагатай бол шинэ захидал илгээнэ." };

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const parsedBody = await readJsonObject<{ email?: string; turnstileToken?: string }>(request, 8_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
  const email = normalizeEmail(body.email);
  const turnstile = await verifyTurnstile(request, body.turnstileToken);
  if (!turnstile.ok) return NextResponse.json(
    { error: turnstile.configured ? "Аюулгүй байдлын шалгалт амжилтгүй боллоо." : "И-мэйл баталгаажуулалтын хамгаалалт сервер дээр тохируулагдаагүй байна." },
    { status: turnstile.configured ? 400 : 503 },
  );
  const key = await actionAttemptKey(request, "resend", email || "invalid");
  if (await actionIsLocked(key)) return NextResponse.json({ error: "Олон хүсэлт илэрлээ. Түр хүлээгээд дахин оролдоно уу." }, { status: 429 });
  await recordActionFailure(key, 5, 60);
  const user = email ? await findSiteUserByEmail(email) : null;
  if (!user || user.email_status === "verified" || !["pending", "limited", "active"].includes(user.account_status)) {
    return NextResponse.json(generic, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS total, MAX(created_at) AS latest FROM auth_delivery_events WHERE user_id=? AND template='verify_email' AND created_at>?",
  ).bind(user.id, since).first<{ total: number; latest: string | null }>();
  if (Number(recent?.total || 0) >= 5) return NextResponse.json({ error: "Өнөөдрийн илгээх хязгаарт хүрсэн байна." }, { status: 429 });
  if (recent?.latest && Date.now() - new Date(recent.latest).getTime() < 60_000) {
    return NextResponse.json({ error: "Дахин илгээхийн өмнө 60 секунд хүлээнэ үү." }, { status: 429 });
  }
  const token = createSecretToken();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE site_user_tokens SET status='invalidated' WHERE user_id=? AND purpose='verify_email' AND status='pending'").bind(user.id),
    env.DB.prepare(
      "INSERT INTO site_user_tokens (id,user_id,purpose,email_value,token_hash,status,expires_at,created_at) VALUES (?,?,'verify_email',?,?,'pending',?,?)",
    ).bind(crypto.randomUUID(), user.id, user.email, await digest(token), new Date(Date.now() + EMAIL_TOKEN_MAX_AGE_MS).toISOString(), now),
    env.DB.prepare("UPDATE site_users SET email_status='queued',updated_at=? WHERE id=?").bind(now, user.id),
  ]);
  const verifyUrl = new URL("/verify-email", request.url);
  verifyUrl.searchParams.set("token", token);
  const delivery = await sendAccountEmail({ userId: user.id, email: user.email, name: user.full_name, locale: user.locale, template: "verify_email", actionUrl: verifyUrl.toString() });
  await env.DB.prepare("UPDATE site_users SET email_status=?,updated_at=? WHERE id=?")
    .bind(delivery.sent ? "sent" : "delivery_failed", new Date().toISOString(), user.id).run();
  await clearActionFailures(key);
  return NextResponse.json({ ...generic, emailSent: delivery.sent }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
