import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  EMAIL_TOKEN_MAX_AGE_MS,
  PRIVACY_VERSION,
  TERMS_VERSION,
  actionAttemptKey,
  actionIsLocked,
  clearActionFailures,
  createSecretToken,
  digest,
  findSiteUserByEmail,
  newPasswordCredential,
  normalizeLocale,
  recordActionFailure,
  validateRegistrationInput,
} from "../../../lib/site-user-auth";
import {
  sendAccountEmail,
  verifyTurnstile,
} from "../../../lib/transactional-email";
import { issuePhoneVerification } from "../../../lib/site-user-phone-verification";
import { readSiteUserVerificationPolicy } from "../../../lib/site-user-verification";

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return reply({ error: "Origin mismatch" }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: "Хүсэлтийн формат буруу байна." }, 400);
  }
  if (body.website) return reply({ registered: true, emailSent: true }, 202);
  const formStartedAt = Number(body.formStartedAt || 0);
  if (
    !formStartedAt ||
    Date.now() - formStartedAt < 500 ||
    Date.now() - formStartedAt > 24 * 60 * 60 * 1000
  ) {
    return reply(
      { error: "Бүртгэлийн маягтыг дахин нээгээд оролдоно уу." },
      400,
    );
  }
  const turnstile = await verifyTurnstile(request, body.turnstileToken);
  if (!turnstile.ok)
    return reply(
      { error: turnstile.configured ? "Аюулгүй байдлын шалгалт амжилтгүй боллоо." : "Бүртгэлийн хамгаалалт сервер дээр тохируулагдаагүй байна." },
      turnstile.configured ? 400 : 503,
    );

  const input = validateRegistrationInput(body);
  if (!input.valid)
    return reply({ error: input.errors[0], errors: input.errors }, 400);
  const attemptKey = await actionAttemptKey(request, "register", input.email);
  if (await actionIsLocked(attemptKey))
    return reply(
      { error: "Олон хүсэлт илэрлээ. 60 минутын дараа дахин оролдоно уу." },
      429,
    );
  await recordActionFailure(attemptKey, 5, 60);

  const existing = await findSiteUserByEmail(input.email);
  if (existing) {
    return reply(
      {
        registered: true,
        emailSent: true,
        message:
          "Хэрэв энэ и-мэйл бүртгэлтэй бол баталгаажуулах заавар хүчинтэй төлвөөр үлдэнэ.",
      },
      202,
    );
  }

  const policy = await readSiteUserVerificationPolicy();
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const token = policy.emailRequired ? createSecretToken() : null;
  const tokenHash = token ? await digest(token) : null;
  const tokenExpiresAt = token
    ? new Date(Date.now() + EMAIL_TOKEN_MAX_AGE_MS).toISOString()
    : null;
  const credential = await newPasswordCredential(input.password);
  const locale = normalizeLocale(body.locale);
  const marketingEmail = body.marketingEmailOptIn === true;
  const marketingSms = body.marketingSmsOptIn === true;
  const initialPhoneStatus = policy.phoneRequired ? 'unverified' : 'not_required';

  try {
    const statements = [
      env.DB.prepare(
        `INSERT INTO site_users
         (id,full_name,email,phone_country_iso,phone_calling_code,phone_e164,password_hash,password_salt,
          account_status,email_status,phone_status /* defaults to 'unverified' when required */,email_verification_required,phone_verification_required,locale,terms_version,privacy_version,terms_accepted_at,
          privacy_accepted_at,marketing_email_opt_in,marketing_sms_opt_in,security_sms_enabled,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        userId,
        input.fullName,
        input.email,
        input.phoneCountryIso,
        input.phoneCallingCode,
        input.phoneE164,
        credential.hash,
        credential.salt,
        policy.phoneRequired && !policy.emailRequired
          ? "limited"
          : policy.emailRequired || policy.phoneRequired
            ? "pending"
            : "active",
        policy.emailRequired ? "queued" : "not_required",
        initialPhoneStatus,
        policy.emailRequired ? 1 : 0,
        policy.phoneRequired ? 1 : 0,
        locale,
        TERMS_VERSION,
        PRIVACY_VERSION,
        now,
        now,
        marketingEmail ? 1 : 0,
        marketingSms ? 1 : 0,
        1,
        now,
        now,
      ),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,?,'accepted','registration',?)",
      ).bind(crypto.randomUUID(), userId, "terms", TERMS_VERSION, now),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,?,'accepted','registration',?)",
      ).bind(crypto.randomUUID(), userId, "privacy", PRIVACY_VERSION, now),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,'not_applicable',?,'registration',?)",
      ).bind(
        crypto.randomUUID(),
        userId,
        "marketing_email",
        marketingEmail ? "opt_in" : "opt_out",
        now,
      ),
      env.DB.prepare(
        "INSERT INTO site_user_consents (id,user_id,consent_type,policy_version,status,source,created_at) VALUES (?,?,?,'not_applicable',?,'registration',?)",
      ).bind(
        crypto.randomUUID(),
        userId,
        "marketing_sms",
        marketingSms ? "opt_in" : "opt_out",
        now,
      ),
    ];
    if (token && tokenHash && tokenExpiresAt) {
      statements.splice(
        1,
        0,
        env.DB.prepare(
          "INSERT INTO site_user_tokens (id,user_id,purpose,email_value,token_hash,status,expires_at,created_at) VALUES (?,?,'verify_email',?,?,'pending',?,?)",
        ).bind(
          crypto.randomUUID(),
          userId,
          input.email,
          tokenHash,
          tokenExpiresAt,
          now,
        ),
      );
    }
    await env.DB.batch(statements);
  } catch {
    return reply(
      {
        error:
          "Бүртгэлийг хадгалж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.",
      },
      409,
    );
  }

  let emailSent = !policy.emailRequired;
  if (token) {
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
    emailSent = delivery.sent;
    await env.DB.prepare(
      "UPDATE site_users SET email_status=?,updated_at=? WHERE id=?",
    )
      .bind(
        delivery.sent ? "sent" : "delivery_failed",
        new Date().toISOString(),
        userId,
      )
      .run();
  }
  const phone = policy.phoneRequired
    ? await issuePhoneVerification(userId)
    : { sent: false, status: "not_required" };
  await clearActionFailures(attemptKey);
  const message =
    policy.emailRequired && policy.phoneRequired
      ? "Бүртгэл үүслээ. И-мэйл болон SMS кодоор бүртгэлээ баталгаажуулна уу."
      : policy.emailRequired
        ? "Бүртгэл үүслээ. И-мэйлээр ирсэн холбоосоор баталгаажуулна уу."
        : policy.phoneRequired
          ? "Бүртгэл үүслээ. SMS кодоор утасны дугаараа баталгаажуулна уу."
          : "Бүртгэл амжилттай үүслээ.";
  return reply(
    {
      registered: true,
      emailSent,
      emailStatus: policy.emailRequired
        ? emailSent
          ? "sent"
          : "delivery_failed"
        : "not_required",
      phoneStatus: phone.status,
      message,
    },
    emailSent && (!policy.phoneRequired || phone.sent) ? 201 : 202,
  );
}
