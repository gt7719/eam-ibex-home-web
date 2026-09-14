CREATE TABLE `customer_ai_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_hash` text NOT NULL,
	`channel` text NOT NULL,
	`event_type` text NOT NULL,
	`model` text,
	`status` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_ai_audit_subject_created_idx` ON `customer_ai_audit_events` (`subject_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `customer_ai_audit_channel_created_idx` ON `customer_ai_audit_events` (`channel`,`created_at`);--> statement-breakpoint
CREATE TABLE `customer_ai_consents` (
	`subject_hash` text NOT NULL,
	`consent_type` text NOT NULL,
	`policy_version` text NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`subject_hash`, `consent_type`)
);
--> statement-breakpoint
CREATE INDEX `customer_ai_consents_status_idx` ON `customer_ai_consents` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `customer_ai_monthly_usage` (
	`subject_hash` text NOT NULL,
	`month_key` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_usd` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`subject_hash`, `month_key`)
);
--> statement-breakpoint
CREATE INDEX `customer_ai_monthly_usage_month_idx` ON `customer_ai_monthly_usage` (`month_key`);--> statement-breakpoint
CREATE TABLE `customer_ai_rate_limits` (
	`subject_hash` text NOT NULL,
	`scope` text NOT NULL,
	`window_key` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`subject_hash`, `scope`, `window_key`)
);
--> statement-breakpoint
CREATE INDEX `customer_ai_rate_limits_window_idx` ON `customer_ai_rate_limits` (`scope`,`window_key`);--> statement-breakpoint
PRAGMA optimize;
