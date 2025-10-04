CREATE TABLE `box_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`at_bats` integer DEFAULT 0,
	`hits` integer DEFAULT 0,
	`walks` integer DEFAULT 0,
	`strikeouts` integer DEFAULT 0,
	`runs` integer DEFAULT 0,
	`rbis` integer DEFAULT 0,
	`pitches_thrown` integer DEFAULT 0,
	`strikes` integer DEFAULT 0,
	`balls` integer DEFAULT 0,
	`strikeouts_pitch` integer DEFAULT 0,
	`walks_pitch` integer DEFAULT 0,
	`putouts` integer DEFAULT 0,
	`assists` integer DEFAULT 0,
	`errors` integer DEFAULT 0,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `box_scores_game_player_unique` ON `box_scores` (`game_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `box_scores_game_player_idx` ON `box_scores` (`game_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`home_team_id` integer NOT NULL,
	`away_team_id` integer NOT NULL,
	`home_score` integer DEFAULT 0,
	`away_score` integer DEFAULT 0,
	`current_inning` integer DEFAULT 1,
	`is_top_half` integer DEFAULT 1,
	`home_batter_index` integer DEFAULT 0,
	`away_batter_index` integer DEFAULT 0,
	`outs` integer DEFAULT 0,
	`is_game_over` integer DEFAULT 0,
	`winner_team_id` integer,
	`home_inning_scores` text,
	`away_inning_scores` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`winner_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_teams_unique` ON `games` (`home_team_id`,`away_team_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`firstname` text NOT NULL,
	`lastname` text NOT NULL,
	`contact` real DEFAULT 0,
	`power` real DEFAULT 0,
	`running` real DEFAULT 0,
	`pitching` real DEFAULT 0,
	`fielding` real DEFAULT 0,
	`charisma` real DEFAULT 0,
	`growth` real DEFAULT 0,
	`active_position` text NOT NULL,
	`primary_position` text NOT NULL,
	`team_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_team_id_unique` ON `players` (`team_id`);--> statement-breakpoint
CREATE INDEX `players_name_idx` ON `players` (`firstname`,`lastname`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_email_unique` ON `users_table` (`email`);