CREATE TABLE `vinyls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discogs_id` text,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`year` integer,
	`label` text,
	`genre` text,
	`format` text,
	`condition` text,
	`condition_notes` text,
	`cover_image_url` text,
	`discogs_url` text,
	`spotify_url` text,
	`notes` text,
	`current_value` real,
	`value_updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vinyls_discogs_id_unique` ON `vinyls` (`discogs_id`);