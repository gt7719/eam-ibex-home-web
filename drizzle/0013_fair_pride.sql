ALTER TABLE `site_user_provisioning_outbox` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_provisioning_outbox_idempotency_unique` ON `site_user_provisioning_outbox` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `site_user_subscription_events` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_subscription_events_idempotency_unique` ON `site_user_subscription_events` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `site_user_subscriptions` ADD `payment_confirmation_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `site_user_subscriptions_payment_confirmation_unique` ON `site_user_subscriptions` (`payment_confirmation_key`);--> statement-breakpoint
UPDATE `admin_users`
SET `permissions_json`='["pricing.manage","partners.manage","people.manage","knowledge.manage","media.upload"]',
    `updated_at`=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE `role`='editor' AND (`permissions_json` IS NULL OR trim(`permissions_json`)='');
