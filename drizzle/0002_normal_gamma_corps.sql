CREATE TABLE `ai_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`action_type` text NOT NULL,
	`requested_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	`decided_at` text
);
--> statement-breakpoint
CREATE INDEX `ai_approvals_tenant_status_idx` ON `ai_approvals` (`tenant_id`,`status`);--> statement-breakpoint
CREATE TABLE `ai_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`model` text,
	`tool` text,
	`status` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_audit_tenant_created_idx` ON `ai_audit_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_monthly_usage` (
	`tenant_id` text NOT NULL,
	`month_key` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant_id`, `month_key`)
);
--> statement-breakpoint
CREATE INDEX `ai_monthly_usage_lookup_idx` ON `ai_monthly_usage` (`tenant_id`,`month_key`);--> statement-breakpoint
