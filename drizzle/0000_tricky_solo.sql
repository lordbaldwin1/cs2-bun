CREATE TABLE `matches` (
	`match_url` text PRIMARY KEY NOT NULL,
	`w_avg_leetify_rating` real,
	`w_avg_personal_performance` real,
	`w_avg_hltv_rating` real,
	`w_avg_kd` real,
	`w_avg_aim` real,
	`w_avg_utility` real,
	`l_avg_leetify_rating` real,
	`l_avg_personal_performance` real,
	`l_avg_hltv_rating` real,
	`l_avg_kd` real,
	`l_avg_aim` real,
	`l_avg_utility` real,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`steam_id` text NOT NULL,
	`leetify_rating` real,
	`personal_performance` real,
	`hltv_rating` real,
	`kd` real,
	`adr` real,
	`aim` real,
	`utility` real,
	`won` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`steam_id`) REFERENCES `players`(`steam_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`steam_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`country` text NOT NULL,
	`faceit_url` text NOT NULL,
	`avatar` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL
);
