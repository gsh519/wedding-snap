ALTER TABLE `download_jobs` ADD `secret_token` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `download_jobs_secret_token_unique` ON `download_jobs` (`secret_token`);