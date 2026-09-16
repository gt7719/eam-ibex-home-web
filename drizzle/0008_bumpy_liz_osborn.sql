CREATE TABLE `site_user_provisioning_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`payload_json` text NOT NULL,
	`response_json` text,
	`last_attempt_at` text,
	`delivered_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_user_provisioning_outbox_subscription_idx` ON `site_user_provisioning_outbox` (`subscription_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `site_user_provisioning_outbox_status_idx` ON `site_user_provisioning_outbox` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `site_user_subscription_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_user_subscription_events_subscription_idx` ON `site_user_subscription_events` (`subscription_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `site_user_subscription_events_user_idx` ON `site_user_subscription_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_user_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_name` text NOT NULL,
	`plan_id` text NOT NULL,
	`plan_name` text NOT NULL,
	`plan_snapshot_json` text NOT NULL,
	`duration_months` integer NOT NULL,
	`base_amount_mnt` integer,
	`discount_amount_mnt` integer DEFAULT 0 NOT NULL,
	`final_amount_mnt` integer,
	`promotion_snapshot_json` text,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`subscription_status` text DEFAULT 'payment_pending' NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`core_tenant_id` text,
	`core_tenant_admin_id` text,
	`core_workspace_url` text,
	`provisioning_status` text DEFAULT 'not_requested' NOT NULL,
	`last_provisioning_attempt_at` text,
	`provisioned_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_user_subscriptions_user_created_idx` ON `site_user_subscriptions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `site_user_subscriptions_status_idx` ON `site_user_subscriptions` (`subscription_status`,`provisioning_status`);--> statement-breakpoint
CREATE INDEX `site_user_subscriptions_end_idx` ON `site_user_subscriptions` (`ends_at`);