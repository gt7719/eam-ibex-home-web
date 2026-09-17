CREATE TABLE `customer_ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`message_order` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_ai_messages_user_created_idx` ON `customer_ai_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_ai_messages_request_order_unique` ON `customer_ai_messages` (`request_id`,`message_order`);