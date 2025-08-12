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