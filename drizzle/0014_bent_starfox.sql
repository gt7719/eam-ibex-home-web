CREATE TABLE `marketing_ai_budget_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_hash` text NOT NULL,
	`month_key` text NOT NULL,
	`amount_usd` real NOT NULL,
	`actual_cost_usd` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `marketing_ai_budget_reservations_month_status_idx` ON `marketing_ai_budget_reservations` (`month_key`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `marketing_ai_budget_reservations_subject_idx` ON `marketing_ai_budget_reservations` (`subject_hash`,`created_at`);