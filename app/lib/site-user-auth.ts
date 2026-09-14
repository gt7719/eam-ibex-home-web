import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { hashPassword, isValidEmail, verifyPassword } from "./site-admin";

export const SITE_USER_SESSION_COOKIE = "ibex_user_session";
export const SITE_USER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const TERMS_VERSION = "2026-09-v1";
export const PRIVACY_VERSION = "2026-09-v1";
export const EMAIL_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_MAX_AGE_MS = 30 * 60 * 1000;

export type SiteUserRow = {
  id: string;
  full_name: string;
  email: string;
  phone_country_iso: string;
  phone_calling_code: string;
  phone_e164: string;
  account_status: string;
  email_status: string;
  email_verified_at: string | null;
  phone_status: string;
  phone_verified_at: string | null;
  locale: "mn" | "en";
  marketing_email_opt_in: number;
  marketing_sms_opt_in: number;
  security_sms_enabled: number;
  last_login_at: string | null;
  locked_until: string | null;
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
  password_hash?: string;
  password_salt?: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return bytesToHex(bytes);
}

export function createSecretToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

export function normalizeLocale(value: unknown): "mn" | "en" {
  return value === "en" ? "en" : "mn";
}

export function validateSitePassword(password: string) {
  const errors: string[] = [];
  if (password.length < 8 || password.length > 128) errors.push("Нууц үг 8–128 тэмдэгт байна.");
  if (!/\p{Lu}/u.test(password)) errors.push("Нууц үг дор хаяж нэг том үсэг агуулна.");
  if (!/\p{N}/u.test(password)) errors.push("Нууц үг дор хаяж нэг тоо агуулна.");
  if (!/[^\p{L}\p{N}\s]/u.test(password)) errors.push("Нууц үг дор хаяж нэг тусгай тэмдэгт агуулна.");
  return errors;
}

export function validateRegistrationInput(input: {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  passwordConfirm?: unknown;
  phoneCountryIso?: unknown;
  phoneCallingCode?: unknown;
  phoneNationalNumber?: unknown;
  termsAccepted?: unknown;
  privacyAccepted?: unknown;
}) {
  const fullName = typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ").slice(0, 160) : "";
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const passwordConfirm = typeof input.passwordConfirm === "string" ? input.passwordConfirm : "";
  const phoneCountryIso = typeof input.phoneCountryIso === "string" ? input.phoneCountryIso.trim().toUpperCase().slice(0, 2) : "";
  const callingDigits = typeof input.phoneCallingCode === "string" ? input.phoneCallingCode.replace(/\D/g, "").slice(0, 4) : "";
  const nationalDigits = typeof input.phoneNationalNumber === "string" ? input.phoneNationalNumber.replace(/\D/g, "").slice(0, 15) : "";
  const phoneE164 = callingDigits && nationalDigits ? `+${callingDigits}${nationalDigits}` : "";
  const errors: string[] = [];
  if (fullName.length < 2) errors.push("Нэрээ бүрэн оруулна уу.");
  if (!isValidEmail(email)) errors.push("Зөв и-мэйл хаяг оруулна уу.");
  errors.push(...validateSitePassword(password));
  if (password !== passwordConfirm) errors.push("Нууц үгийн давталт тохирохгүй байна.");
  if (!/^[A-Z]{2}$/.test(phoneCountryIso)) errors.push("Улсаа сонгоно уу.");
  if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) errors.push("Утасны дугаарыг улсын кодтой зөв оруулна уу.");
  if (input.termsAccepted !== true || input.privacyAccepted !== true) errors.push("Үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрнө үү.");
  return { valid: errors.length === 0, errors, fullName, email, password, phoneCountryIso, phoneCallingCode: `+${callingDigits}`, phoneE164 };
}

export function publicSiteUser(row: SiteUserRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneCountryIso: row.phone_country_iso,
    phoneCallingCode: row.phone_calling_code,
    phoneE164: maskPhone(row.phone_e164),
    accountStatus: row.account_status,
    emailStatus: row.email_status,
    emailVerifiedAt: row.email_verified_at,
    phoneStatus: row.phone_status,
    phoneVerifiedAt: row.phone_verified_at,
    locale: row.locale,
    marketingEmailOptIn: Boolean(row.marketing_email_opt_in),
    marketingSmsOptIn: Boolean(row.marketing_sms_opt_in),
    securitySmsEnabled: Boolean(row.security_sms_enabled),
    lastLoginAt: row.last_login_at,
    deletionRequestedAt: row.deletion_requested_at,
    createdAt: row.created_at,
  };
}

export function maskPhone(value: string) {
  if (value.length < 7) return value;
  return `${value.slice(0, 4)} •••• ${value.slice(-3)}`;
}

export function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function findSiteUserByEmail(email: string, includeCredential = false) {
  const credential = includeCredential ? ", password_hash, password_salt" : "";
  return env.DB.prepare(
    `SELECT id, full_name, email, phone_country_iso, phone_calling_code, phone_e164,
     account_status, email_status, email_verified_at, phone_status, phone_verified_at,
     locale, marketing_email_opt_in, marketing_sms_opt_in, security_sms_enabled,
     last_login_at, locked_until, deletion_requested_at, created_at, updated_at${credential}
     FROM site_users WHERE email = ? LIMIT 1`,
  ).bind(email).first<SiteUserRow>();
}

export async function createSiteUserSession(userId: string) {
  const token = createSecretToken();
  const tokenHash = await digest(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SITE_USER_SESSION_MAX_AGE * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM site_user_sessions WHERE expires_at <= ? OR status != 'active'").bind(createdAt),
    env.DB.prepare(
      "INSERT INTO site_user_sessions (id,user_id,token_hash,status,expires_at,created_at) VALUES (?,?,?,'active',?,?)",
    ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt, createdAt),
    env.DB.prepare("UPDATE site_users SET last_login_at=?,updated_at=? WHERE id=?").bind(createdAt, createdAt, userId),
  ]);
  return token;
}

export async function getSiteUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SITE_USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT u.id, u.full_name, u.email, u.phone_country_iso, u.phone_calling_code, u.phone_e164,
     u.account_status, u.email_status, u.email_verified_at, u.phone_status, u.phone_verified_at,
     u.locale, u.marketing_email_opt_in, u.marketing_sms_opt_in, u.security_sms_enabled,
     u.last_login_at, u.locked_until, u.deletion_requested_at, u.created_at, u.updated_at
     FROM site_user_sessions s INNER JOIN site_users u ON u.id=s.user_id
     WHERE s.token_hash=? AND s.status='active' AND s.expires_at>? AND u.account_status IN ('active','limited')
     LIMIT 1`,
  ).bind(await digest(token), now).first<SiteUserRow>();
  return row ? publicSiteUser(row) : null;
}

export async function revokeSiteUserSession(token: string | undefined) {
  if (!token) return;
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE site_user_sessions SET status='logged_out',revoked_at=? WHERE token_hash=?")
    .bind(now, await digest(token)).run();
}

export async function verifySiteUserPassword(row: SiteUserRow, password: string) {
  return row.password_hash && row.password_salt
    ? verifyPassword(password, row.password_salt, row.password_hash)
    : false;
}

export async function newPasswordCredential(password: string) {
  return hashPassword(password);
}

export async function actionAttemptKey(request: Request, action: string, subject: string) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return digest(`${action}|${subject.toLowerCase()}|${ip}`);
}

export async function actionIsLocked(key: string) {
  const row = await env.DB.prepare("SELECT locked_until FROM site_user_login_attempts WHERE attempt_key=? LIMIT 1")
    .bind(key).first<{ locked_until: string | null }>();
  return Boolean(row?.locked_until && row.locked_until > new Date().toISOString());
}

export async function recordActionFailure(key: string, maxAttempts = 5, windowMinutes = 15) {
  const now = new Date();
  const row = await env.DB.prepare("SELECT attempt_count,first_attempt_at FROM site_user_login_attempts WHERE attempt_key=? LIMIT 1")
    .bind(key).first<{ attempt_count: number; first_attempt_at: string }>();
  const withinWindow = row && now.getTime() - new Date(row.first_attempt_at).getTime() < windowMinutes * 60 * 1000;
  const count = withinWindow ? Number(row.attempt_count) + 1 : 1;
  const firstAttemptAt = withinWindow ? row.first_attempt_at : now.toISOString();
  const lockedUntil = count >= maxAttempts ? new Date(now.getTime() + windowMinutes * 60 * 1000).toISOString() : null;
  await env.DB.prepare(
    `INSERT INTO site_user_login_attempts (attempt_key,attempt_count,first_attempt_at,locked_until,updated_at)
     VALUES (?,?,?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET attempt_count=excluded.attempt_count,
     first_attempt_at=excluded.first_attempt_at,locked_until=excluded.locked_until,updated_at=excluded.updated_at`,
  ).bind(key, count, firstAttemptAt, lockedUntil, now.toISOString()).run();
  return { locked: Boolean(lockedUntil) };
}

export async function clearActionFailures(key: string) {
  await env.DB.prepare("DELETE FROM site_user_login_attempts WHERE attempt_key=?").bind(key).run();
}
