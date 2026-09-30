CREATE TABLE "admin_login_attempts" (
	"attempt_key" text PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" text NOT NULL,
	"locked_until" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"permissions_json" text DEFAULT '["pricing.manage","partners.manage","people.manage","knowledge.manage","media.upload"]' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_access" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ai_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"action_type" text NOT NULL,
	"requested_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"created_at" text NOT NULL,
	"decided_at" text
);
--> statement-breakpoint
CREATE TABLE "ai_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"model" text,
	"tool" text,
	"status" text NOT NULL,
	"metadata_json" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_monthly_usage" (
	"tenant_id" text NOT NULL,
	"month_key" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ai_monthly_usage_tenant_id_month_key_pk" PRIMARY KEY("tenant_id","month_key")
);
--> statement-breakpoint
CREATE TABLE "ai_rate_limits" (
	"subject_hash" text NOT NULL,
	"scope" text NOT NULL,
	"window_key" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ai_rate_limits_subject_hash_scope_window_key_pk" PRIMARY KEY("subject_hash","scope","window_key")
);
--> statement-breakpoint
CREATE TABLE "auth_delivery_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"recipient_masked" text NOT NULL,
	"provider" text DEFAULT 'unconfigured' NOT NULL,
	"provider_message_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"error_code" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ai_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_hash" text NOT NULL,
	"channel" text NOT NULL,
	"event_type" text NOT NULL,
	"model" text,
	"status" text NOT NULL,
	"metadata_json" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ai_consents" (
	"subject_hash" text NOT NULL,
	"consent_type" text NOT NULL,
	"policy_version" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "customer_ai_consents_subject_hash_consent_type_pk" PRIMARY KEY("subject_hash","consent_type")
);
--> statement-breakpoint
CREATE TABLE "customer_ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"request_id" text NOT NULL,
	"message_order" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ai_monthly_usage" (
	"subject_hash" text NOT NULL,
	"month_key" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "customer_ai_monthly_usage_subject_hash_month_key_pk" PRIMARY KEY("subject_hash","month_key")
);
--> statement-breakpoint
CREATE TABLE "customer_ai_rate_limits" (
	"subject_hash" text NOT NULL,
	"scope" text NOT NULL,
	"window_key" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "customer_ai_rate_limits_subject_hash_scope_window_key_pk" PRIMARY KEY("subject_hash","scope","window_key")
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"event_type" text NOT NULL,
	"model" text,
	"status" text NOT NULL,
	"metadata_json" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_budget_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_hash" text NOT NULL,
	"month_key" text NOT NULL,
	"amount_usd" real NOT NULL,
	"actual_cost_usd" real,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"title" text NOT NULL,
	"task_type" text NOT NULL,
	"prompt_profile" text NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"content" text NOT NULL,
	"missing_inputs_json" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"submitted_at" text,
	"decided_by" text,
	"decided_at" text,
	"decision_note" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_monthly_usage" (
	"subject_hash" text NOT NULL,
	"month_key" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "marketing_ai_monthly_usage_subject_hash_month_key_pk" PRIMARY KEY("subject_hash","month_key")
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_rate_limits" (
	"subject_hash" text NOT NULL,
	"scope" text NOT NULL,
	"window_key" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "marketing_ai_rate_limits_subject_hash_scope_window_key_pk" PRIMARY KEY("subject_hash","scope","window_key")
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_records" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data_json" text DEFAULT '{}' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"owner_id" text NOT NULL,
	"approved_by" text,
	"approved_at" text,
	"published_at" text,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_ai_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"revision" integer NOT NULL,
	"change_type" text NOT NULL,
	"snapshot_json" text NOT NULL,
	"changed_by" text NOT NULL,
	"note" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_by" text,
	"created_at" text NOT NULL,
	CONSTRAINT "media_assets_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "site_content" (
	"key" text PRIMARY KEY NOT NULL,
	"value_json" text NOT NULL,
	"updated_by" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_name" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"admin_note" text,
	"submitted_at" text,
	"decided_at" text,
	"provisioned_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"consent_type" text NOT NULL,
	"policy_version" text NOT NULL,
	"status" text NOT NULL,
	"source" text DEFAULT 'registration' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_login_attempts" (
	"attempt_key" text PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" text NOT NULL,
	"locked_until" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_profile_images" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "site_user_profile_images_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "site_user_profile_images_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "site_user_provisioning_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"idempotency_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"payload_json" text NOT NULL,
	"response_json" text,
	"last_attempt_at" text,
	"delivered_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "site_user_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "site_user_sms_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phone_e164" text NOT NULL,
	"code_hash" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"expires_at" text NOT NULL,
	"resend_available_at" text NOT NULL,
	"created_at" text NOT NULL,
	"verified_at" text
);
--> statement-breakpoint
CREATE TABLE "site_user_subscription_events" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"idempotency_key" text,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"payload_json" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_name" text NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"plan_snapshot_json" text NOT NULL,
	"duration_months" integer NOT NULL,
	"base_amount_mnt" integer,
	"discount_amount_mnt" integer DEFAULT 0 NOT NULL,
	"final_amount_mnt" integer,
	"promotion_snapshot_json" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_confirmation_key" text,
	"subscription_status" text DEFAULT 'payment_pending' NOT NULL,
	"starts_at" text,
	"ends_at" text,
	"core_tenant_id" text,
	"core_tenant_admin_id" text,
	"core_workspace_url" text,
	"provisioning_status" text DEFAULT 'not_requested' NOT NULL,
	"last_provisioning_attempt_at" text,
	"provisioned_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_user_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"purpose" text NOT NULL,
	"email_value" text,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "site_user_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "site_users" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_country_iso" text NOT NULL,
	"phone_calling_code" text NOT NULL,
	"phone_e164" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"account_status" text DEFAULT 'pending' NOT NULL,
	"email_status" text DEFAULT 'unverified' NOT NULL,
	"email_verified_at" text,
	"phone_status" text DEFAULT 'unverified' NOT NULL,
	"phone_verified_at" text,
	"email_verification_required" boolean DEFAULT true NOT NULL,
	"phone_verification_required" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'mn' NOT NULL,
	"terms_version" text NOT NULL,
	"privacy_version" text NOT NULL,
	"terms_accepted_at" text NOT NULL,
	"privacy_accepted_at" text NOT NULL,
	"marketing_email_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_sms_opt_in" boolean DEFAULT false NOT NULL,
	"security_sms_enabled" boolean DEFAULT true NOT NULL,
	"last_login_at" text,
	"locked_until" text,
	"deletion_requested_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "site_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "admin_login_attempts_updated_idx" ON "admin_login_attempts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expiry_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_users_status_idx" ON "admin_users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_approvals_tenant_status_idx" ON "ai_approvals" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "ai_audit_tenant_created_idx" ON "ai_audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_monthly_usage_lookup_idx" ON "ai_monthly_usage" USING btree ("tenant_id","month_key");--> statement-breakpoint
CREATE INDEX "ai_rate_limits_window_idx" ON "ai_rate_limits" USING btree ("scope","window_key");--> statement-breakpoint
CREATE INDEX "auth_delivery_events_user_status_idx" ON "auth_delivery_events" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "auth_delivery_events_created_idx" ON "auth_delivery_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customer_ai_audit_subject_created_idx" ON "customer_ai_audit_events" USING btree ("subject_hash","created_at");--> statement-breakpoint
CREATE INDEX "customer_ai_audit_channel_created_idx" ON "customer_ai_audit_events" USING btree ("channel","created_at");--> statement-breakpoint
CREATE INDEX "customer_ai_consents_status_idx" ON "customer_ai_consents" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "customer_ai_messages_user_created_idx" ON "customer_ai_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_ai_messages_request_order_unique" ON "customer_ai_messages" USING btree ("request_id","message_order");--> statement-breakpoint
CREATE INDEX "customer_ai_monthly_usage_month_idx" ON "customer_ai_monthly_usage" USING btree ("month_key");--> statement-breakpoint
CREATE INDEX "customer_ai_rate_limits_window_idx" ON "customer_ai_rate_limits" USING btree ("scope","window_key");--> statement-breakpoint
CREATE INDEX "marketing_ai_audit_created_idx" ON "marketing_ai_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "marketing_ai_budget_reservations_month_status_idx" ON "marketing_ai_budget_reservations" USING btree ("month_key","status","expires_at");--> statement-breakpoint
CREATE INDEX "marketing_ai_budget_reservations_subject_idx" ON "marketing_ai_budget_reservations" USING btree ("subject_hash","created_at");--> statement-breakpoint
CREATE INDEX "marketing_ai_drafts_status_updated_idx" ON "marketing_ai_drafts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "marketing_ai_drafts_admin_updated_idx" ON "marketing_ai_drafts" USING btree ("admin_id","updated_at");--> statement-breakpoint
CREATE INDEX "marketing_ai_monthly_usage_month_idx" ON "marketing_ai_monthly_usage" USING btree ("month_key");--> statement-breakpoint
CREATE INDEX "marketing_ai_rate_limits_window_idx" ON "marketing_ai_rate_limits" USING btree ("scope","window_key");--> statement-breakpoint
CREATE INDEX "marketing_ai_records_domain_status_idx" ON "marketing_ai_records" USING btree ("domain","status","updated_at");--> statement-breakpoint
CREATE INDEX "marketing_ai_records_owner_updated_idx" ON "marketing_ai_records" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_ai_revisions_entity_revision_unique" ON "marketing_ai_revisions" USING btree ("entity_type","entity_id","revision");--> statement-breakpoint
CREATE INDEX "marketing_ai_revisions_entity_created_idx" ON "marketing_ai_revisions" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_created_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "site_user_access_requests_user_status_idx" ON "site_user_access_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "site_user_consents_user_type_idx" ON "site_user_consents" USING btree ("user_id","consent_type","created_at");--> statement-breakpoint
CREATE INDEX "site_user_login_attempts_updated_idx" ON "site_user_login_attempts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "site_user_profile_images_updated_idx" ON "site_user_profile_images" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "site_user_provisioning_outbox_subscription_idx" ON "site_user_provisioning_outbox" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "site_user_provisioning_outbox_status_idx" ON "site_user_provisioning_outbox" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_user_provisioning_outbox_idempotency_unique" ON "site_user_provisioning_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "site_user_sessions_user_idx" ON "site_user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "site_user_sessions_expiry_idx" ON "site_user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "site_user_sms_user_status_idx" ON "site_user_sms_verifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "site_user_subscription_events_subscription_idx" ON "site_user_subscription_events" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "site_user_subscription_events_user_idx" ON "site_user_subscription_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_user_subscription_events_idempotency_unique" ON "site_user_subscription_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "site_user_subscriptions_user_created_idx" ON "site_user_subscriptions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "site_user_subscriptions_status_idx" ON "site_user_subscriptions" USING btree ("subscription_status","provisioning_status");--> statement-breakpoint
CREATE INDEX "site_user_subscriptions_end_idx" ON "site_user_subscriptions" USING btree ("ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_user_subscriptions_payment_confirmation_unique" ON "site_user_subscriptions" USING btree ("payment_confirmation_key");--> statement-breakpoint
CREATE INDEX "site_user_tokens_user_purpose_idx" ON "site_user_tokens" USING btree ("user_id","purpose","status");--> statement-breakpoint
CREATE INDEX "site_user_tokens_expiry_idx" ON "site_user_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "site_users_status_idx" ON "site_users" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "site_users_created_idx" ON "site_users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_users_verified_phone_unique" ON "site_users" USING btree ("phone_e164") WHERE "site_users"."phone_status" = 'verified';