PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`api_hits` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_metrics`("id", "api_hits") SELECT "id", "api_hits" FROM `metrics`;--> statement-breakpoint
DROP TABLE `metrics`;--> statement-breakpoint
ALTER TABLE `__new_metrics` RENAME TO `metrics`;--> statement-breakpoint
PRAGMA foreign_keys=ON;