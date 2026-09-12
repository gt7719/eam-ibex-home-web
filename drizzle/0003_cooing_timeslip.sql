CREATE TABLE `admin_login_attempts` (
	`attempt_key` text PRIMARY KEY NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` text NOT NULL,
	`locked_until` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_login_attempts_updated_idx` ON `admin_login_attempts` (`updated_at`);