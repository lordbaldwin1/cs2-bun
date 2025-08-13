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

export type TeamStats = {
  leetify_rating: number | null;
  hltv_rating: number | null;
  kd: number | null;
  aim: number | null;
  utility: number | null;
  won: number;
};

export async function getTeamStats(): Promise<TeamStats[]> {
  const result = await db
    .select({
      wAvgLeetifyRating: matches.wAvgLeetifyRating,
      wAvgHLTVRating: matches.wAvgHLTVRating,
      wAvgKD: matches.wAvgKD,
      wAvgAim: matches.wAvgAim,
      wAvgUtility: matches.wAvgUtility,
      lAvgLeetifyRating: matches.lAvgLeetifyRating,
      lAvgHLTVRating: matches.lAvgHLTVRating,
      lAvgKD: matches.lAvgKD,
      lAvgAim: matches.lAvgAim,
      lAvgUtility: matches.lAvgUtility,
    })
    .from(matches);

  const teamStats: TeamStats[] = [];

  for (const match of result) {
    teamStats.push({
      leetify_rating: match.wAvgLeetifyRating,
      hltv_rating: match.wAvgHLTVRating,
      kd: match.wAvgKD,
      aim: match.wAvgAim,
      utility: match.wAvgUtility,
      won: 1,
    });

    teamStats.push({
      leetify_rating: match.lAvgLeetifyRating,
      hltv_rating: match.lAvgHLTVRating,
      kd: match.lAvgKD,
      aim: match.lAvgAim,
      utility: match.lAvgUtility,
      won: 0,
    });
  }

  return teamStats;
}
