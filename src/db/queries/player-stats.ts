import { avg, sql } from "drizzle-orm";
import { db } from "..";
import { playerStats, type NewPlayerStats } from "../schema";


export async function savePlayerStats(player: NewPlayerStats) {
  const [res] = await db
    .insert(playerStats)
    .values(player)
    .onConflictDoNothing()
    .returning();
  return res;
}

export async function getPlayerStatsGrouped() {
  const rows = await db
    .select({
      steamID: playerStats.steamID,
      avgLR: sql<number>`COALESCE(AVG(${playerStats.leetifyRating}), 0)`,
      avgHR: sql<number>`COALESCE(AVG(${playerStats.hltvRating}), 0)`,
      avgKD: sql<number>`COALESCE(AVG(${playerStats.kd}), 0)`,
      avgAim: sql<number>`COALESCE(AVG(${playerStats.aim}), 0)`,
      avgUtil: sql<number>`COALESCE(AVG(${playerStats.utility}), 0)`,
      avgWon: sql<number>`COALESCE(AVG(${playerStats.won}), 0)`,
    })
    .from(playerStats)
    .groupBy(playerStats.steamID);
  return rows.length > 0 ? rows : [];
}