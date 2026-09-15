CREATE TABLE `ai_rate_limits` (
	`subject_hash` text NOT NULL,
	`scope` text NOT NULL,
	`window_key` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`subject_hash`, `scope`, `window_key`)
);
--> statement-breakpoint
CREATE INDEX `ai_rate_limits_window_idx` ON `ai_rate_limits` (`scope`,`window_key`);