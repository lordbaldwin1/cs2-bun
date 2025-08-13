import { getPlayerStatsGrouped } from "../db/queries/player-stats";


export async function calculatePlayerPoints() {
    const players = await getPlayerStatsGrouped();
    return players;
}

calculatePlayerPoints();