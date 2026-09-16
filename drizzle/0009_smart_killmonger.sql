CREATE TABLE `site_user_profile_images` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_profile_images_user_id_unique` ON `site_user_profile_images` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_profile_images_object_key_unique` ON `site_user_profile_images` (`object_key`);--> statement-breakpoint
CREATE INDEX `site_user_profile_images_updated_idx` ON `site_user_profile_images` (`updated_at`);--> statement-breakpoint
ALTER TABLE `site_users` ADD `email_verification_required` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `site_users` ADD `phone_verification_required` integer DEFAULT false NOT NULL;