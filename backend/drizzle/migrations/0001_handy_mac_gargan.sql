ALTER TABLE `download_jobs` ADD `total_files` integer;--> statement-breakpoint
ALTER TABLE `download_jobs` ADD `zip_count` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `download_jobs` ADD `zip_r2_keys` text;--> statement-breakpoint
ALTER TABLE `download_jobs` ADD `deleted_at` text;