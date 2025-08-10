import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

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
