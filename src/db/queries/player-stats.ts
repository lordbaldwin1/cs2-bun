import { avg } from "drizzle-orm";
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
      avgLR: avg(playerStats.leetifyRating),
      avgHR: avg(playerStats.hltvRating),
      avgKD: avg(playerStats.kd),
      avgAim: avg(playerStats.aim),
      avgUtil: avg(playerStats.utility),
      avgWon: avg(playerStats.won),
    })
    .from(playerStats)
    .groupBy(playerStats.steamID);
  return rows.length > 0 ? rows : [];
}