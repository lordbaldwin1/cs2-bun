import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  steamID: text("steam_id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  faceitURL: text("faceit_url").notNull(),
  avatar: text("avatar").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export type NewPlayer = typeof players.$inferInsert;
export type Player = typeof players.$inferSelect;

export const matches = sqliteTable("matches", {
  matchURL: text("match_url").primaryKey(),

  wAvgLeetifyRating: real("w_avg_leetify_rating"),
  wAvgPersonalPerformance: real("w_avg_personal_performance"),
  wAvgHLTVRating: real("w_avg_hltv_rating"),
  wAvgKD: real("w_avg_kd"),
  wAvgAim: real("w_avg_aim"),
  wAvgUtility: real("w_avg_utility"),

  lAvgLeetifyRating: real("l_avg_leetify_rating"),
  lAvgPersonalPerformance: real("l_avg_personal_performance"),
  lAvgHLTVRating: real("l_avg_hltv_rating"),
  lAvgKD: real("l_avg_kd"),
  lAvgAim: real("l_avg_aim"),
  lAvgUtility: real("l_avg_utility"),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),

  updatedAt: text("updated_at")
    .notNull()
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export type NewMatch = typeof matches.$inferInsert;
export type Match = typeof matches.$inferSelect;

export const playerStats = sqliteTable("player_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  leetifyRating: real("leetify_rating"),
  personalPerformance: real("personal_performance"),
  hltvRating: real("hltv_rating"),
  kd: real("kd"),
  adr: real("adr"),
  aim: real("aim"),
  utility: real("utility"),
  won: integer("won", { mode: 'boolean' }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export type NewPlayerStats = typeof playerStats.$inferInsert;
export type PlayerStats = typeof playerStats.$inferSelect;
