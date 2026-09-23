CREATE TABLE `marketing_ai_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`title` text NOT NULL,
	`task_type` text NOT NULL,
	`prompt_profile` text NOT NULL,
	`prompt_version` text NOT NULL,
	`model` text NOT NULL,
	`content` text NOT NULL,
	`missing_inputs_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`estimated_cost_usd` real DEFAULT 0 NOT NULL,
	`submitted_at` text,
	`decided_by` text,
	`decided_at` text,
	`decision_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `marketing_ai_drafts_status_updated_idx` ON `marketing_ai_drafts` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `marketing_ai_drafts_admin_updated_idx` ON `marketing_ai_drafts` (`admin_id`,`updated_at`);