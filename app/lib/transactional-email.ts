import { env } from "cloudflare:workers";
import { maskEmail, maskPhone } from "./site-user-auth";

type EmailTemplate = "verify_email" | "password_reset";

type RuntimeEmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  TURNSTILE_SECRET_KEY?: string;
  IBEX_SMS_DELIVERY_URL?: string;
  IBEX_SMS_DELIVERY_TOKEN?: string;
  IBEX_SMS_FROM?: string;
};

function runtimeEnv() {
  return env as unknown as RuntimeEmailEnv & { DB: D1Database };
}

export async function sendAccountSms(input: {
  userId: string;
  phoneE164: string;
  locale: "mn" | "en";
  code: string;
}) {
  const runtime = runtimeEnv();
  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();
  const url = runtime.IBEX_SMS_DELIVERY_URL?.trim();
  const token = runtime.IBEX_SMS_DELIVERY_TOKEN?.trim();
  let validUrl: URL | null = null;
  try {
    validUrl = url ? new URL(url) : null;
  } catch {
    validUrl = null;
  }
  const configured = Boolean(validUrl?.protocol === "https:" && token);
  await runtime.DB.prepare(
    `INSERT INTO auth_delivery_events
     (id,user_id,channel,template,recipient_masked,provider,status,attempt_count,created_at,updated_at)
     VALUES (?,?,'sms','verify_phone',?,?, 'queued',0,?,?)`,
  )
    .bind(
      eventId,
      input.userId,
      maskPhone(input.phoneE164),
      configured ? "configured_connector" : "unconfigured",
      now,
      now,
    )
    .run();
  if (!configured || !validUrl) {
    await runtime.DB.prepare(
      "UPDATE auth_delivery_events SET status='failed',error_code='provider_not_configured',attempt_count=1,updated_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), eventId)
      .run();
    return { sent: false, reason: "provider_not_configured" as const };
  }
  const message =
    input.locale === "en"
      ? `Your iBeX verification code is ${input.code}. It expires in 10 minutes.`
      : `Таны iBeX баталгаажуулах код: ${input.code}. Код 10 минутын хугацаанд хүчинтэй.`;
  try {
    const response = await fetch(validUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.phoneE164,
        from: runtime.IBEX_SMS_FROM || "iBeX",
        message,
        template: "verify_phone",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      messageId?: string;
    };
    if (!response.ok) {
      await runtime.DB.prepare(
        "UPDATE auth_delivery_events SET status='failed',error_code=?,attempt_count=1,updated_at=? WHERE id=?",
      )
        .bind(`provider_${response.status}`, new Date().toISOString(), eventId)
        .run();
      return { sent: false, reason: "provider_error" as const };
    }
    await runtime.DB.prepare(
      "UPDATE auth_delivery_events SET status='sent',provider_message_id=?,attempt_count=1,updated_at=? WHERE id=?",
    )
      .bind(
        payload.id || payload.messageId || null,
        new Date().toISOString(),
        eventId,
      )
      .run();
    return { sent: true, reason: null };
  } catch {
    await runtime.DB.prepare(
      "UPDATE auth_delivery_events SET status='failed',error_code='network_error',attempt_count=1,updated_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), eventId)
      .run();
    return { sent: false, reason: "network_error" as const };
  }
}

function htmlEscape(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] || character,
  );
}

function emailCopy(
  template: EmailTemplate,
  locale: "mn" | "en",
  name: string,
  actionUrl: string,
) {
  const safeName = htmlEscape(name);
  const safeUrl = htmlEscape(actionUrl);
  if (template === "password_reset") {
    return locale === "en"
      ? {
          subject: "Reset your iBeX website password",
          text: `Hello ${name},\n\nUse this secure link within 30 minutes to reset your password:\n${actionUrl}\n\nIf you did not request this, ignore this email.`,
          html: `<h1>Password reset</h1><p>Hello ${safeName},</p><p>Use the button below within 30 minutes to set a new password.</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this, ignore this email.</p>`,
        }
      : {
          subject: "iBeX веб бүртгэлийн нууц үг сэргээх",
          text: `Сайн байна уу, ${name}.\n\n30 минутын дотор дараах хамгаалалттай холбоосоор нууц үгээ шинэчилнэ үү:\n${actionUrl}\n\nТа хүсэлт гаргаагүй бол энэ захидлыг үл хэрэгсэнэ үү.`,
          html: `<h1>Нууц үг сэргээх</h1><p>Сайн байна уу, ${safeName}.</p><p>Доорх товчийг 30 минутын дотор ашиглан шинэ нууц үг тохируулна уу.</p><p><a href="${safeUrl}">Нууц үг шинэчлэх</a></p><p>Та хүсэлт гаргаагүй бол энэ захидлыг үл хэрэгсэнэ үү.</p>`,
        };
  }
  return locale === "en"
    ? {
        subject: "Verify your iBeX website account",
        text: `Hello ${name},\n\nVerify your email within 24 hours:\n${actionUrl}\n\nThis website account does not automatically create access to the core iBeX system.`,
        html: `<h1>Verify your email</h1><p>Hello ${safeName},</p><p>Confirm your iBeX website registration within 24 hours.</p><p><a href="${safeUrl}">Verify email</a></p><p>This website account does not automatically create access to the core iBeX system.</p>`,
      }
    : {
        subject: "iBeX веб бүртгэлээ баталгаажуулна уу",
        text: `Сайн байна уу, ${name}.\n\n24 цагийн дотор дараах холбоосоор и-мэйлээ баталгаажуулна уу:\n${actionUrl}\n\nЭнэ веб бүртгэл нь үндсэн iBeX системийн эрхийг автоматаар үүсгэхгүй.`,
        html: `<h1>И-мэйлээ баталгаажуулна уу</h1><p>Сайн байна уу, ${safeName}.</p><p>iBeX веб бүртгэлээ 24 цагийн дотор баталгаажуулна уу.</p><p><a href="${safeUrl}">И-мэйл баталгаажуулах</a></p><p>Энэ веб бүртгэл нь үндсэн iBeX системийн эрхийг автоматаар үүсгэхгүй.</p>`,
      };
}

export async function sendAccountEmail(input: {
  userId: string;
  email: string;
  name: string;
  locale: "mn" | "en";
  template: EmailTemplate;
  actionUrl: string;
}) {
  const runtime = runtimeEnv();
  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();
  const provider = runtime.RESEND_API_KEY ? "resend" : "unconfigured";
  await runtime.DB.prepare(
    `INSERT INTO auth_delivery_events
     (id,user_id,channel,template,recipient_masked,provider,status,attempt_count,created_at,updated_at)
     VALUES (?,?, 'email', ?, ?, ?, 'queued', 0, ?, ?)`,
  )
    .bind(
      eventId,
      input.userId,
      input.template,
      maskEmail(input.email),
      provider,
      now,
      now,
    )
    .run();

  if (!runtime.RESEND_API_KEY) {
    await runtime.DB.prepare(
      "UPDATE auth_delivery_events SET status='failed',error_code='provider_not_configured',attempt_count=1,updated_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), eventId)
      .run();
    return { sent: false, reason: "provider_not_configured" as const };
  }

  const copy = emailCopy(
    input.template,
    input.locale,
    input.name,
    input.actionUrl,
  );
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: runtime.EMAIL_FROM || "iBeX Account <no-reply@account.ibex.mn>",
        reply_to: runtime.EMAIL_REPLY_TO || "support@ibex.mn",
        to: [input.email],
        subject: copy.subject,
        text: copy.text,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#2d2434">${copy.html}<hr style="border:0;border-top:1px solid #ddd;margin:28px 0"><small>iBeX • Enterprise Asset Management</small></div>`,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
    };
    if (!response.ok) {
      await runtime.DB.prepare(
        "UPDATE auth_delivery_events SET status='failed',error_code=?,attempt_count=1,updated_at=? WHERE id=?",
      )
        .bind(`provider_${response.status}`, new Date().toISOString(), eventId)
        .run();
      return { sent: false, reason: "provider_error" as const };
    }
    await runtime.DB.prepare(
      "UPDATE auth_delivery_events SET status='sent',provider_message_id=?,attempt_count=1,updated_at=? WHERE id=?",
    )
      .bind(payload.id || null, new Date().toISOString(), eventId)
      .run();
    return { sent: true, reason: null };
  } catch {
    await runtime.DB.prepare(
      "UPDATE auth_delivery_events SET status='failed',error_code='network_error',attempt_count=1,updated_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), eventId)
      .run();
    return { sent: false, reason: "network_error" as const };
  }
}

export async function verifyTurnstile(
  request: Request,
  responseToken: unknown,
) {
  const runtime = runtimeEnv();
  // Public auth endpoints must never silently lose their bot protection when a
  // deployment is missing its secret. The UI readiness endpoint prevents
  // submission, and this server-side guard remains the authoritative check.
  if (!runtime.TURNSTILE_SECRET_KEY?.trim()) return { ok: false, configured: false };
  if (typeof responseToken !== "string" || !responseToken)
    return { ok: false, configured: true };
  const form = new FormData();
  form.set("secret", runtime.TURNSTILE_SECRET_KEY);
  form.set("response", responseToken);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.set("remoteip", ip);
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    const payload = (await response.json()) as { success?: boolean };
    return { ok: response.ok && payload.success === true, configured: true };
  } catch {
    return { ok: false, configured: true };
  }
}
