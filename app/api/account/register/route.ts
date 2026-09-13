import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  EMAIL_TOKEN_MAX_AGE_MS,
  PRIVACY_VERSION,
  TERMS_VERSION,
  actionAttemptKey,
  actionIsLocked,
  createSecretToken,
  digest,
  findSiteUserByEmail,
  newPasswordCredential,
  normalizeLocale,
  recordActionFailure,
  validateRegistrationInput,
} from "../../../lib/site-user-auth";
import { sendAccountEmail, verifyTurnstile } from "../../../lib/transactional-email";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return reply({ error: "Хүсэлтийн формат буруу байна." }, 400);
  }
  if (body.website) return reply({ registered: true, emailSent: true }, 202);
  const formStartedAt = Number(body.formStartedAt || 0);
  if (!formStartedAt || Date.now() - formStartedAt < 500 || Date.now() - formStartedAt > 24 * 60 * 60 * 1000) {
    return reply({ error: "Бүртгэлийн маягтыг дахин нээгээд оролдоно уу." }, 400);
  }
  const turnstile = await verifyTurnstile(request, body.turnstileToken);
  if (!turnstile.ok) return reply({ error: "Аюулгүй байдлын шалгалт амжилтгүй боллоо." }, 400);

  const input = validateRegistrationInput(body);
  if (!input.valid) return reply({ error: input.errors[0], errors: input.errors }, 400);
  const attemptKey = await actionAttemptKey(request, "register", input.email);
  if (await actionIsLocked(attemptKey)) return reply({ error: "Олон хүсэлт илэрлээ. 60 минутын дараа дахин оролдоно уу." }, 429);
  await recordActionFailure(attemptKey, 5, 60);

  const existing = await findSiteUserByEmail(input.email);
  if (existing) {
    return reply({
      registered: true,
      emailSent: true,
      message: "Хэрэв энэ и-мэйл бүртгэлтэй бол баталгаажуулах заавар хүчинтэй төлвөөр үлдэнэ.",
    }, 202);
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const token = createSecretToken();
  const tokenHash = await digest(token);
  const tokenExpiresAt = new Date(Date.now() + EMAIL_TOKEN_MAX_AGE_MS).toISOString();
  const credential = await newPasswordCredential(input.password);
  const locale = normalizeLocale(body.locale);
  const marketingEmail = body.marketingEmailOptIn === true;
  const marketingSms = body.marketingSmsOptIn === true;

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO site_users
         (id,full_name,email,phone_country_iso,phone_calling_code,phone_e164,password_hash,password_salt,
          account_status,email_status,phone_status,locale,terms_version,privacy_version,terms_accepted_at,
          privacy_accepted_at,marketing_email_opt_in,marketing_sms_opt_in,security_sms_enabled,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,'pending','queued','unverified',?,?,?,?,?,?,?,1,?,?)`,
      ).bind(userId, input.fullName, input.email, input.phoneCountryIso, input.phoneCallingCode, input.phoneE164,
        credential.hash, credential.salt, locale, TERMS_VERSION, PRIVACY_VERSION, now, now,
        marketingEmail ? 1 : 0, marketingSms ? 1 : 0, now, now),
      env.DB.prepare(
        "INSERT INTO site_user_tokens (id,user_id,purpose,email_value,token_hash,status,expires_at,created_at) VALUES (?,?,'verify_email',?,?,'pending',?,?)",
      ).bind(crypto.randomUUID(), userId, input.email, tokenHash, tokenExpiresAt, now),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,?,'accepted','registration',?)",
      ).bind(crypto.randomUUID(), userId, "terms", TERMS_VERSION, now),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,?,'accepted','registration',?)",
      ).bind(crypto.randomUUID(), userId, "privacy", PRIVACY_VERSION, now),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,'not_applicable',?,'registration',?)",
      ).bind(crypto.randomUUID(), userId, "marketing_email", marketingEmail ? "opt_in" : "opt_out", now),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,'not_applicable',?,'registration',?)",
      ).bind(crypto.randomUUID(), userId, "marketing_sms", marketingSms ? "opt_in" : "opt_out", now),
    ]);
  } catch {
    return reply({ error: "Бүртгэлийг хадгалж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу." }, 409);
  }

  const verifyUrl = new URL("/verify-email", request.url);
  verifyUrl.searchParams.set("token", token);
  const delivery = await sendAccountEmail({
    userId,
    email: input.email,
    name: input.fullName,
    locale,
    template: "verify_email",
    actionUrl: verifyUrl.toString(),
  });
  await env.DB.prepare("UPDATE site_users SET email_status=?,updated_at=? WHERE id=?")
    .bind(delivery.sent ? "sent" : "delivery_failed", new Date().toISOString(), userId).run();
  return reply({
    registered: true,
    emailSent: delivery.sent,
    emailStatus: delivery.sent ? "sent" : "delivery_failed",
    phoneStatus: "unverified",
    message: delivery.sent
      ? "Бүртгэл үүслээ. И-мэйлээр ирсэн холбоосоор баталгаажуулна уу."
      : "Бүртгэл үүслээ. И-мэйл илгээх үйлчилгээ тохируулагдаагүй тул админтай холбогдоно уу.",
  }, delivery.sent ? 201 : 202);
}
