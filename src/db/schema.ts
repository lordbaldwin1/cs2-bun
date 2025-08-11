import { sql } from "drizzle-orm";
import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  steamID: text("steam_id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  faceitURL: text("faceit_url").notNull(),
  avatar: text("avatar").notNull(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().$onUpdate(() => sql`(CURRENT_TIMESTAMP)`)
});

export type NewPlayer = typeof players.$inferInsert;
export type Player = typeof players.$inferSelect;

export const matches = sqliteTable("matches", {
  matchURL: text("match_url").primaryKey(),

  wAvgLeetifyRating: real("w_avg_leetify_rating").notNull(),
  wAvgPersonalPerformance: real("w_avg_personal_performance").notNull(),
  wAvgHLTVRating: real("w_avg_hltv_rating").notNull(),
  wAvgKD: real("w_avg_kd").notNull(),
  wAvgAim: real("w_avg_aim").notNull(),
  wAvgUtility: real("w_avg_utility").notNull(),

  lAvgLeetifyRating: real("l_avg_leetify_rating").notNull(),
  lAvgPersonalPerformance: real("l_avg_personal_performance").notNull(),
  lAvgHLTVRating: real("l_avg_hltv_rating").notNull(),
  lAvgKD: real("l_avg_kd").notNull(),
  lAvgAim: real("l_avg_aim").notNull(),
  lAvgUtility: real("l_avg_utility").notNull(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),

  updatedAt: text("updated_at")
    .notNull()
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export type NewMatch = typeof matches.$inferInsert;
export type Match = typeof matches.$inferSelect;
