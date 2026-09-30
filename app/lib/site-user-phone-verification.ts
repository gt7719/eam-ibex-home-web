import { env } from "@/app/runtime/env";
import { accountStatusAfterVerification } from "./site-user-verification";
import { digest } from "./site-user-auth";
import { sendAccountSms } from "./transactional-email";

type PhoneVerificationUser = {
  id: string;
  full_name: string;
  phone_e164: string;
  locale: "mn" | "en";
  account_status: string;
  email_status: string;
  phone_status: string;
  email_verification_required: number;
  phone_verification_required: number;
};

function verificationCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

async function phoneUser(userId: string) {
  return env.DB.prepare(
    `SELECT id,full_name,phone_e164,locale,account_status,email_status,phone_status,
     email_verification_required,phone_verification_required FROM site_users WHERE id=? LIMIT 1`,
  )
    .bind(userId)
    .first<PhoneVerificationUser>();
}

export async function issuePhoneVerification(userId: string) {
  const user = await phoneUser(userId);
  if (!user) throw new Error("Хэрэглэгч олдсонгүй.");
  if (!user.phone_verification_required)
    return { required: false, sent: false, status: "not_required" };
  if (user.phone_status === "verified")
    return { required: true, sent: true, status: "verified" };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const deliveries = await env.DB.prepare(
    "SELECT COUNT(*) AS total,MAX(created_at) AS latest FROM auth_delivery_events WHERE user_id=? AND template='verify_phone' AND created_at>?",
  )
    .bind(userId, since)
    .first<{ total: number; latest: string | null }>();
  if (Number(deliveries?.total || 0) >= 5)
    throw new Error("Өнөөдрийн SMS илгээх хязгаарт хүрсэн байна.");
  if (
    deliveries?.latest &&
    Date.now() - new Date(deliveries.latest).getTime() < 60_000
  )
    throw new Error("Дахин SMS илгээхийн өмнө 60 секунд хүлээнэ үү.");
  const code = verificationCode();
  const now = new Date().toISOString();
  const verificationId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE site_user_sms_verifications SET status='invalidated' WHERE user_id=? AND status IN ('queued','sent')",
    ).bind(userId),
    env.DB.prepare(
      "INSERT INTO site_user_sms_verifications (id,user_id,phone_e164,code_hash,status,attempt_count,expires_at,resend_available_at,created_at) VALUES (?,?,?,?, 'queued',0,?,?,?)",
    ).bind(
      verificationId,
      userId,
      user.phone_e164,
      await digest(`phone_verify:${userId}:${code}`),
      new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      new Date(Date.now() + 60_000).toISOString(),
      now,
    ),
    env.DB.prepare(
      "UPDATE site_users SET phone_status='queued',updated_at=? WHERE id=?",
    ).bind(now, userId),
  ]);
  const delivery = await sendAccountSms({
    userId,
    phoneE164: user.phone_e164,
    locale: user.locale,
    code,
  });
  const status = delivery.sent ? "sent" : "delivery_failed";
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE site_user_sms_verifications SET status=? WHERE id=?",
    ).bind(status, verificationId),
    env.DB.prepare(
      "UPDATE site_users SET phone_status=?,updated_at=? WHERE id=?",
    ).bind(status, new Date().toISOString(), userId),
  ]);
  return { required: true, sent: delivery.sent, status };
}

export async function verifyPhoneVerification(userId: string, code: unknown) {
  const normalizedCode =
    typeof code === "string" ? code.replace(/\D/g, "") : "";
  if (!/^\d{6}$/.test(normalizedCode))
    throw new Error("6 оронтой SMS код оруулна уу.");
  const user = await phoneUser(userId);
  if (!user) throw new Error("Хэрэглэгч олдсонгүй.");
  if (!user.phone_verification_required)
    return { required: false, verified: true, status: "not_required" };
  const now = new Date().toISOString();
  const record = await env.DB.prepare(
    "SELECT id,code_hash,status,attempt_count,expires_at FROM site_user_sms_verifications WHERE user_id=? AND status='sent' ORDER BY created_at DESC LIMIT 1",
  )
    .bind(userId)
    .first<{
      id: string;
      code_hash: string;
      status: string;
      attempt_count: number;
      expires_at: string;
    }>();
  if (!record)
    throw new Error("Идэвхтэй SMS код олдсонгүй. Шинэ код илгээнэ үү.");
  if (record.expires_at <= now) {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE site_user_sms_verifications SET status='expired' WHERE id=?",
      ).bind(record.id),
      env.DB.prepare(
        "UPDATE site_users SET phone_status='expired',updated_at=? WHERE id=?",
      ).bind(now, userId),
    ]);
    throw new Error("SMS кодын хугацаа дууссан байна.");
  }
  const expected = await digest(`phone_verify:${userId}:${normalizedCode}`);
  if (expected !== record.code_hash) {
    const attempts = Number(record.attempt_count) + 1;
    const status = attempts >= 5 ? "locked" : "sent";
    await env.DB.prepare(
      "UPDATE site_user_sms_verifications SET attempt_count=?,status=? WHERE id=?",
    )
      .bind(attempts, status, record.id)
      .run();
    if (attempts >= 5)
      await env.DB.prepare(
        "UPDATE site_users SET phone_status='locked',updated_at=? WHERE id=?",
      )
        .bind(now, userId)
        .run();
    throw new Error(
      attempts >= 5
        ? "Олон буруу код оруулсан тул шинэ SMS код авна уу."
        : "SMS код буруу байна.",
    );
  }
  const nextStatus = accountStatusAfterVerification(
    {
      emailStatus: user.email_status,
      phoneStatus: "verified",
      emailRequired: user.email_verification_required,
      phoneRequired: user.phone_verification_required,
    },
    user.account_status,
  );
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE site_user_sms_verifications SET status='verified',verified_at=? WHERE id=?",
    ).bind(now, record.id),
    env.DB.prepare(
      "UPDATE site_user_sms_verifications SET status='invalidated' WHERE user_id=? AND id!=? AND status IN ('queued','sent')",
    ).bind(userId, record.id),
    env.DB.prepare(
      "UPDATE site_users SET phone_status='verified',phone_verified_at=?,account_status=?,updated_at=? WHERE id=?",
    ).bind(now, nextStatus, now, userId),
  ]);
  return {
    required: true,
    verified: true,
    status: "verified",
    accountStatus: nextStatus,
  };
}
