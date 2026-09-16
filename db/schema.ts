import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    role: text("role").notNull().default("editor"),
    permissionsJson: text("permissions_json")
      .notNull()
      .default('["pricing.manage","partners.manage","people.manage","knowledge.manage","media.upload"]'),
    status: text("status").notNull().default("active"),
    lastAccess: text("last_access"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("admin_users_status_idx").on(table.status)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("admin_sessions_user_idx").on(table.userId),
    index("admin_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const adminLoginAttempts = sqliteTable(
  "admin_login_attempts",
  {
    attemptKey: text("attempt_key").primaryKey(),
    attemptCount: integer("attempt_count").notNull().default(0),
    firstAttemptAt: text("first_attempt_at").notNull(),
    lockedUntil: text("locked_until"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("admin_login_attempts_updated_idx").on(table.updatedAt)],
);

export const siteContent = sqliteTable("site_content", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: text("updated_at").notNull(),
});

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull().unique(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("media_assets_created_idx").on(table.createdAt)],
);

export const aiMonthlyUsage = sqliteTable(
  "ai_monthly_usage",
  {
    tenantId: text("tenant_id").notNull(),
    monthKey: text("month_key").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.monthKey] }),
    index("ai_monthly_usage_lookup_idx").on(table.tenantId, table.monthKey),
  ],
);

export const aiAuditEvents = sqliteTable(
  "ai_audit_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    eventType: text("event_type").notNull(),
    model: text("model"),
    tool: text("tool"),
    status: text("status").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("ai_audit_tenant_created_idx").on(table.tenantId, table.createdAt)],
);

export const aiRateLimits = sqliteTable(
  "ai_rate_limits",
  {
    subjectHash: text("subject_hash").notNull(),
    scope: text("scope").notNull(),
    windowKey: text("window_key").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHash, table.scope, table.windowKey] }),
    index("ai_rate_limits_window_idx").on(table.scope, table.windowKey),
  ],
);

export const aiApprovals = sqliteTable(
  "ai_approvals",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    actionType: text("action_type").notNull(),
    requestedBy: text("requested_by").notNull(),
    status: text("status").notNull().default("pending"),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull(),
    decidedAt: text("decided_at"),
  },
  (table) => [index("ai_approvals_tenant_status_idx").on(table.tenantId, table.status)],
);

// iBeX Home customer/marketing AI data is deliberately isolated from the
// industrial Hybrid/System AI tables above. These tables contain only hashed
// subjects, consent state, aggregate usage and privacy-safe audit metadata.
export const customerAiConsents = sqliteTable(
  "customer_ai_consents",
  {
    subjectHash: text("subject_hash").notNull(),
    consentType: text("consent_type").notNull(),
    policyVersion: text("policy_version").notNull(),
    status: text("status").notNull(),
    source: text("source").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHash, table.consentType] }),
    index("customer_ai_consents_status_idx").on(table.status, table.updatedAt),
  ],
);

export const customerAiRateLimits = sqliteTable(
  "customer_ai_rate_limits",
  {
    subjectHash: text("subject_hash").notNull(),
    scope: text("scope").notNull(),
    windowKey: text("window_key").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHash, table.scope, table.windowKey] }),
    index("customer_ai_rate_limits_window_idx").on(table.scope, table.windowKey),
  ],
);

export const customerAiMonthlyUsage = sqliteTable(
  "customer_ai_monthly_usage",
  {
    subjectHash: text("subject_hash").notNull(),
    monthKey: text("month_key").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHash, table.monthKey] }),
    index("customer_ai_monthly_usage_month_idx").on(table.monthKey),
  ],
);

export const customerAiAuditEvents = sqliteTable(
  "customer_ai_audit_events",
  {
    id: text("id").primaryKey(),
    subjectHash: text("subject_hash").notNull(),
    channel: text("channel").notNull(),
    eventType: text("event_type").notNull(),
    model: text("model"),
    status: text("status").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("customer_ai_audit_subject_created_idx").on(table.subjectHash, table.createdAt),
    index("customer_ai_audit_channel_created_idx").on(table.channel, table.createdAt),
  ],
);

// Administrator-only Marketing AI uses its own namespace and OpenAI project.
// It never shares usage, rate-limit or audit rows with Home AI or System AI.
export const marketingAiRateLimits = sqliteTable(
  "marketing_ai_rate_limits",
  {
    subjectHash: text("subject_hash").notNull(),
    scope: text("scope").notNull(),
    windowKey: text("window_key").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHash, table.scope, table.windowKey] }),
    index("marketing_ai_rate_limits_window_idx").on(table.scope, table.windowKey),
  ],
);

export const marketingAiMonthlyUsage = sqliteTable(
  "marketing_ai_monthly_usage",
  {
    subjectHash: text("subject_hash").notNull(),
    monthKey: text("month_key").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectHash, table.monthKey] }),
    index("marketing_ai_monthly_usage_month_idx").on(table.monthKey),
  ],
);

export const marketingAiAuditEvents = sqliteTable(
  "marketing_ai_audit_events",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").notNull(),
    eventType: text("event_type").notNull(),
    model: text("model"),
    status: text("status").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("marketing_ai_audit_created_idx").on(table.createdAt)],
);

// Public website accounts are intentionally separate from both admin_users
// and the tenant users of the core iBeX product.
export const siteUsers = sqliteTable(
  "site_users",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phoneCountryIso: text("phone_country_iso").notNull(),
    phoneCallingCode: text("phone_calling_code").notNull(),
    phoneE164: text("phone_e164").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    accountStatus: text("account_status").notNull().default("pending"),
    emailStatus: text("email_status").notNull().default("unverified"),
    emailVerifiedAt: text("email_verified_at"),
    phoneStatus: text("phone_status").notNull().default("unverified"),
    phoneVerifiedAt: text("phone_verified_at"),
    locale: text("locale").notNull().default("mn"),
    termsVersion: text("terms_version").notNull(),
    privacyVersion: text("privacy_version").notNull(),
    termsAcceptedAt: text("terms_accepted_at").notNull(),
    privacyAcceptedAt: text("privacy_accepted_at").notNull(),
    marketingEmailOptIn: integer("marketing_email_opt_in", { mode: "boolean" }).notNull().default(false),
    marketingSmsOptIn: integer("marketing_sms_opt_in", { mode: "boolean" }).notNull().default(false),
    securitySmsEnabled: integer("security_sms_enabled", { mode: "boolean" }).notNull().default(true),
    lastLoginAt: text("last_login_at"),
    lockedUntil: text("locked_until"),
    deletionRequestedAt: text("deletion_requested_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("site_users_status_idx").on(table.accountStatus),
    index("site_users_created_idx").on(table.createdAt),
    uniqueIndex("site_users_verified_phone_unique")
      .on(table.phoneE164)
      .where(sql`${table.phoneStatus} = 'verified'`),
  ],
);

export const siteUserSessions = sqliteTable(
  "site_user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("active"),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("site_user_sessions_user_idx").on(table.userId),
    index("site_user_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const siteUserTokens = sqliteTable(
  "site_user_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    purpose: text("purpose").notNull(),
    emailValue: text("email_value"),
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("pending"),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("site_user_tokens_user_purpose_idx").on(table.userId, table.purpose, table.status),
    index("site_user_tokens_expiry_idx").on(table.expiresAt),
  ],
);

export const siteUserLoginAttempts = sqliteTable(
  "site_user_login_attempts",
  {
    attemptKey: text("attempt_key").primaryKey(),
    attemptCount: integer("attempt_count").notNull().default(0),
    firstAttemptAt: text("first_attempt_at").notNull(),
    lockedUntil: text("locked_until"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("site_user_login_attempts_updated_idx").on(table.updatedAt)],
);

export const siteUserConsents = sqliteTable(
  "site_user_consents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    consentType: text("consent_type").notNull(),
    policyVersion: text("policy_version").notNull(),
    status: text("status").notNull(),
    source: text("source").notNull().default("registration"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("site_user_consents_user_type_idx").on(table.userId, table.consentType, table.createdAt)],
);

export const authDeliveryEvents = sqliteTable(
  "auth_delivery_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    channel: text("channel").notNull(),
    template: text("template").notNull(),
    recipientMasked: text("recipient_masked").notNull(),
    provider: text("provider").notNull().default("unconfigured"),
    providerMessageId: text("provider_message_id"),
    status: text("status").notNull().default("queued"),
    errorCode: text("error_code"),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("auth_delivery_events_user_status_idx").on(table.userId, table.status),
    index("auth_delivery_events_created_idx").on(table.createdAt),
  ],
);

// Reserved for the approved future SMS verification flow. No SMS is sent in v1.0.
export const siteUserSmsVerifications = sqliteTable(
  "site_user_sms_verifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    phoneE164: text("phone_e164").notNull(),
    codeHash: text("code_hash").notNull(),
    status: text("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    resendAvailableAt: text("resend_available_at").notNull(),
    createdAt: text("created_at").notNull(),
    verifiedAt: text("verified_at"),
  },
  (table) => [index("site_user_sms_user_status_idx").on(table.userId, table.status)],
);

export const siteUserAccessRequests = sqliteTable(
  "site_user_access_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    organizationName: text("organization_name"),
    status: text("status").notNull().default("draft"),
    adminNote: text("admin_note"),
    submittedAt: text("submitted_at"),
    decidedAt: text("decided_at"),
    provisionedAt: text("provisioned_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("site_user_access_requests_user_status_idx").on(table.userId, table.status)],
);

// Home Web is the commercial source of truth. These records deliberately do
// not belong to the core eAM tenant database: the core product receives only
// the confirmed provisioning payload it needs to open an operational tenant.
export const siteUserSubscriptions = sqliteTable(
  "site_user_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    organizationName: text("organization_name").notNull(),
    planId: text("plan_id").notNull(),
    planName: text("plan_name").notNull(),
    planSnapshotJson: text("plan_snapshot_json").notNull(),
    durationMonths: integer("duration_months").notNull(),
    baseAmountMnt: integer("base_amount_mnt"),
    discountAmountMnt: integer("discount_amount_mnt").notNull().default(0),
    finalAmountMnt: integer("final_amount_mnt"),
    promotionSnapshotJson: text("promotion_snapshot_json"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    subscriptionStatus: text("subscription_status").notNull().default("payment_pending"),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    coreTenantId: text("core_tenant_id"),
    coreTenantAdminId: text("core_tenant_admin_id"),
    coreWorkspaceUrl: text("core_workspace_url"),
    provisioningStatus: text("provisioning_status").notNull().default("not_requested"),
    lastProvisioningAttemptAt: text("last_provisioning_attempt_at"),
    provisionedAt: text("provisioned_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("site_user_subscriptions_user_created_idx").on(table.userId, table.createdAt),
    index("site_user_subscriptions_status_idx").on(table.subscriptionStatus, table.provisioningStatus),
    index("site_user_subscriptions_end_idx").on(table.endsAt),
  ],
);

export const siteUserSubscriptionEvents = sqliteTable(
  "site_user_subscription_events",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id").notNull(),
    userId: text("user_id").notNull(),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("site_user_subscription_events_subscription_idx").on(table.subscriptionId, table.createdAt),
    index("site_user_subscription_events_user_idx").on(table.userId, table.createdAt),
  ],
);

export const siteUserProvisioningOutbox = sqliteTable(
  "site_user_provisioning_outbox",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id").notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    payloadJson: text("payload_json").notNull(),
    responseJson: text("response_json"),
    lastAttemptAt: text("last_attempt_at"),
    deliveredAt: text("delivered_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("site_user_provisioning_outbox_subscription_idx").on(table.subscriptionId, table.createdAt),
    index("site_user_provisioning_outbox_status_idx").on(table.status, table.updatedAt),
  ],
);
