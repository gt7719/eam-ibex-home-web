import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
