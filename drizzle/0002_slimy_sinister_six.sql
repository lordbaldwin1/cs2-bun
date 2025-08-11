CREATE TABLE `matches` (
	`match_url` text PRIMARY KEY NOT NULL,
	`w_avg_leetify_rating` real NOT NULL,
	`w_avg_personal_performance` real NOT NULL,
	`w_avg_hltv_rating` real NOT NULL,
	`w_avg_kd` real NOT NULL,
	`w_avg_aim` real NOT NULL,
	`w_avg_utility` real NOT NULL,
	`l_avg_leetify_rating` real NOT NULL,
	`l_avg_personal_performance` real NOT NULL,
	`l_avg_hltv_rating` real NOT NULL,
	`l_avg_kd` real NOT NULL,
	`l_avg_aim` real NOT NULL,
	`l_avg_utility` real NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL
);
