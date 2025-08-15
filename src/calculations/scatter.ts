import { getPlayerStatsGrouped } from "../db/queries/player-stats";

export type Scatter = {
  steamID: string;
  avgLR: number;
  avgHR: number;
  avgKD: number;
  avgAim: number;
  avgUtil: number;
  avgWon: number;
};
export async function calculatePlayerPoints() {
  const players: Scatter[] = await getPlayerStatsGrouped();
  return players;
}
