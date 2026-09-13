CREATE TABLE `auth_delivery_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`channel` text NOT NULL,
	`template` text NOT NULL,
	`recipient_masked` text NOT NULL,
	`provider` text DEFAULT 'unconfigured' NOT NULL,
	`provider_message_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_code` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_delivery_events_user_status_idx` ON `auth_delivery_events` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `auth_delivery_events_created_idx` ON `auth_delivery_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `site_user_access_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_name` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`admin_note` text,
	`submitted_at` text,
	`decided_at` text,
	`provisioned_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_user_access_requests_user_status_idx` ON `site_user_access_requests` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `site_user_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`consent_type` text NOT NULL,
	`policy_version` text NOT NULL,
	`status` text NOT NULL,
	`source` text DEFAULT 'registration' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_user_consents_user_type_idx` ON `site_user_consents` (`user_id`,`consent_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_user_login_attempts` (
	`attempt_key` text PRIMARY KEY NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` text NOT NULL,
	`locked_until` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_user_login_attempts_updated_idx` ON `site_user_login_attempts` (`updated_at`);--> statement-breakpoint
CREATE TABLE `site_user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_sessions_token_hash_unique` ON `site_user_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `site_user_sessions_user_idx` ON `site_user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `site_user_sessions_expiry_idx` ON `site_user_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `site_user_sms_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone_e164` text NOT NULL,
	`code_hash` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`resend_available_at` text NOT NULL,
	`created_at` text NOT NULL,
	`verified_at` text
);
--> statement-breakpoint
CREATE INDEX `site_user_sms_user_status_idx` ON `site_user_sms_verifications` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `site_user_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`email_value` text,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_tokens_token_hash_unique` ON `site_user_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `site_user_tokens_user_purpose_idx` ON `site_user_tokens` (`user_id`,`purpose`,`status`);--> statement-breakpoint
CREATE INDEX `site_user_tokens_expiry_idx` ON `site_user_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `site_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone_country_iso` text NOT NULL,
	`phone_calling_code` text NOT NULL,
	`phone_e164` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`account_status` text DEFAULT 'pending' NOT NULL,
	`email_status` text DEFAULT 'unverified' NOT NULL,
	`email_verified_at` text,
	`phone_status` text DEFAULT 'unverified' NOT NULL,
	`phone_verified_at` text,
	`locale` text DEFAULT 'mn' NOT NULL,
	`terms_version` text NOT NULL,
	`privacy_version` text NOT NULL,
	`terms_accepted_at` text NOT NULL,
	`privacy_accepted_at` text NOT NULL,
	`marketing_email_opt_in` integer DEFAULT false NOT NULL,
	`marketing_sms_opt_in` integer DEFAULT false NOT NULL,
	`security_sms_enabled` integer DEFAULT true NOT NULL,
	`last_login_at` text,
	`locked_until` text,
	`deletion_requested_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_users_email_unique` ON `site_users` (`email`);--> statement-breakpoint
CREATE INDEX `site_users_status_idx` ON `site_users` (`account_status`);--> statement-breakpoint
CREATE INDEX `site_users_created_idx` ON `site_users` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_users_verified_phone_unique` ON `site_users` (`phone_e164`) WHERE "site_users"."phone_status" = 'verified';