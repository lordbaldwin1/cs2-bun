import { db } from "..";
import { matches, type NewMatch } from "../schema";


export async function saveMatchStats(newMatch: NewMatch) {
    const [result] = await db
        .insert(matches)
        .values(newMatch)
        .onConflictDoNothing()
        .returning();
    return result;
}