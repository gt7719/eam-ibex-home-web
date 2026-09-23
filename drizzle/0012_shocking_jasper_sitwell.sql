CREATE TABLE `marketing_ai_records` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`owner_id` text NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`published_at` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `marketing_ai_records_domain_status_idx` ON `marketing_ai_records` (`domain`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `marketing_ai_records_owner_updated_idx` ON `marketing_ai_records` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `marketing_ai_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`revision` integer NOT NULL,
	`change_type` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`changed_by` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketing_ai_revisions_entity_revision_unique` ON `marketing_ai_revisions` (`entity_type`,`entity_id`,`revision`);--> statement-breakpoint
CREATE INDEX `marketing_ai_revisions_entity_created_idx` ON `marketing_ai_revisions` (`entity_type`,`entity_id`,`created_at`);