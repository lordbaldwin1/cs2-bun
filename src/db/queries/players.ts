import { db } from "..";
import { players, type NewPlayer } from "../schema";


export async function savePlayer(newPlayer: NewPlayer) {
  const [result] = await db
    .insert(players)
    .values(newPlayer)
    .onConflictDoNothing()
    .returning();
  return result;
}