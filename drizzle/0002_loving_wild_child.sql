CREATE TABLE `league_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`join_date` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `league_teams_season_team_unique` ON `league_teams` (`season_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_name_unique` ON `leagues` (`name`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_league_name_unique` ON `seasons` (`league_id`,`name`);--> statement-breakpoint
ALTER TABLE `games` ADD `league_id` integer REFERENCES leagues(id);--> statement-breakpoint
ALTER TABLE `games` ADD `season_id` integer REFERENCES seasons(id);--> statement-breakpoint
ALTER TABLE `teams` ADD `user_id` integer NOT NULL REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `teams_user_id_idx` ON `teams` (`user_id`);