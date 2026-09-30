import { env } from "@/app/runtime/env";

export const SITE_USER_VERIFICATION_POLICY_KEY =
  "site_user_verification_policy";

export type SiteUserVerificationPolicy = {
  emailRequired: boolean;
  phoneRequired: boolean;
  revision: string | null;
};

export type VerificationSnapshot = {
  emailStatus: string;
  phoneStatus: string;
  emailRequired: boolean | number;
  phoneRequired: boolean | number;
};

const fallback = { emailRequired: true, phoneRequired: false };

function booleanValue(value: unknown, fallbackValue: boolean) {
  return typeof value === "boolean" ? value : fallbackValue;
}

export function normalizeVerificationPolicy(value: unknown) {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    emailRequired: booleanValue(input.emailRequired, fallback.emailRequired),
    phoneRequired: booleanValue(input.phoneRequired, fallback.phoneRequired),
  };
}

export async function readSiteUserVerificationPolicy(): Promise<SiteUserVerificationPolicy> {
  const row = await env.DB.prepare(
    "SELECT value_json,updated_at FROM site_content WHERE key=? LIMIT 1",
  )
    .bind(SITE_USER_VERIFICATION_POLICY_KEY)
    .first<{ value_json: string; updated_at: string }>();
  if (!row) return { ...fallback, revision: null };
  try {
    return {
      ...normalizeVerificationPolicy(JSON.parse(row.value_json)),
      revision: row.updated_at,
    };
  } catch {
    return { ...fallback, revision: row.updated_at };
  }
}

export function verificationIsComplete(snapshot: VerificationSnapshot) {
  const emailRequired = Boolean(snapshot.emailRequired);
  const phoneRequired = Boolean(snapshot.phoneRequired);
  return (
    (!emailRequired ||
      snapshot.emailStatus === "verified" ||
      snapshot.emailStatus === "not_required") &&
    (!phoneRequired ||
      snapshot.phoneStatus === "verified" ||
      snapshot.phoneStatus === "not_required")
  );
}

export function verificationSummary(snapshot: VerificationSnapshot) {
  const emailRequired = Boolean(snapshot.emailRequired);
  const phoneRequired = Boolean(snapshot.phoneRequired);
  const emailComplete =
    !emailRequired ||
    snapshot.emailStatus === "verified" ||
    snapshot.emailStatus === "not_required";
  const phoneComplete =
    !phoneRequired ||
    snapshot.phoneStatus === "verified" ||
    snapshot.phoneStatus === "not_required";
  return {
    emailRequired,
    phoneRequired,
    emailComplete,
    phoneComplete,
    complete: emailComplete && phoneComplete,
  };
}

export function accountStatusAfterVerification(
  snapshot: VerificationSnapshot,
  currentStatus: string,
) {
  if (
    ["suspended", "deactivated", "deletion_requested", "locked"].includes(
      currentStatus,
    )
  )
    return currentStatus;
  return verificationIsComplete(snapshot) ? "active" : "limited";
}
