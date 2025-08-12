PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_matches` (
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
INSERT INTO `__new_matches`("match_url", "w_avg_leetify_rating", "w_avg_personal_performance", "w_avg_hltv_rating", "w_avg_kd", "w_avg_aim", "w_avg_utility", "l_avg_leetify_rating", "l_avg_personal_performance", "l_avg_hltv_rating", "l_avg_kd", "l_avg_aim", "l_avg_utility", "created_at", "updated_at") SELECT "match_url", "w_avg_leetify_rating", "w_avg_personal_performance", "w_avg_hltv_rating", "w_avg_kd", "w_avg_aim", "w_avg_utility", "l_avg_leetify_rating", "l_avg_personal_performance", "l_avg_hltv_rating", "l_avg_kd", "l_avg_aim", "l_avg_utility", "created_at", "updated_at" FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;