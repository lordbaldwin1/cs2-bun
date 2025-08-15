import { getBrowser } from "./browser";
import {
  buildLeetifyMatchURL,
} from "./leetify";
import { type BrowserContext } from "playwright";
import { saveMatchStats } from "../db/queries/matches";
import type { Match, MatchAverageStats, MatchURLAndSteamID } from "./types";
import { fetchFaceitPlayerIDs, fetchFaceitProfiles, savePlayerDetailsToDB } from "./faceit";
import { fetchLeetifyMatchIDs, scrapeMatch, parseMatchTable, getAverageMatchStats } from "./leetify";

export async function startFetchingJob() {
  const region = "EU";
  const limit = 20;
  const maxLeaderboardRank = 1000;

  const browser = await getBrowser();
  const context = await browser.newContext();

  try {
    for (let offset = 0; offset < maxLeaderboardRank; offset += limit) {
      console.log(
        `Beginning fetching ${limit} players, at position ${offset} of ${region} leaderboard.`
      );
      try {
        setTimeout(() => {}, 1000);
        await fetchAndScrape(region, limit, offset, context);
      } catch (err) {
        console.error(err instanceof Error ? err.message : "Unknown error");
        continue;
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function fetchAndScrape(
  region: string,
  limit: number,
  offset: number,
  context: BrowserContext
) {
  const playerIDs = await fetchFaceitPlayerIDs(region, limit, offset);
  if (playerIDs.length === 0) {
    throw new Error("Fetch PlayerIDs failed");
  }

  const playerDetails = await fetchFaceitProfiles(playerIDs);
  if (playerDetails.length === 0) {
    throw new Error("Fetch Player Profiles failed");
  }

  const matchURLsAndSteamIDs: MatchURLAndSteamID[] = [];
  for (const player of playerDetails) {
    const ids = await fetchLeetifyMatchIDs(player.steam_id_64);
    if (ids.length === 0) {
      console.error(`Matches for ${player.nickname} unavailable, skipping...`);
      continue;
    }
    for (const id of ids) {
      matchURLsAndSteamIDs.push({
        url: buildLeetifyMatchURL(id),
        steamID: player.steam_id_64,
      });
    }
  }

  console.log("Finished gathering match URLs");

  for (const matchURLAndSteamID of matchURLsAndSteamIDs) {
    const table = await scrapeMatch(context, matchURLAndSteamID);
    console.log("Match scraped");
    const match: Match = await parseMatchTable(table, matchURLAndSteamID);
    console.log("Match parsed");
    console.log(
      "Match teams:",
      match.teams.map((team) => ({
        won: team.won,
        playerCount: team.players.length,
        samplePlayer: team.players[0],
      }))
    );

    const matchAverageStats = getAverageMatchStats(match);
    console.log("Match average stats computed");

    const savedMatchAverageStats = await saveMatchStats({
      matchURL: matchAverageStats.matchURL,
      wAvgLeetifyRating: matchAverageStats.winAvgLeetifyRating,
      wAvgPersonalPerformance: matchAverageStats.winAvgPersonalPerformance,
      wAvgHLTVRating: matchAverageStats.winAvgHTLVRating,
      wAvgKD: matchAverageStats.winAvgKD,
      wAvgAim: matchAverageStats.winAvgAim,
      wAvgUtility: matchAverageStats.winAvgUtility,
      lAvgLeetifyRating: matchAverageStats.lossAvgLeetifyRating,
      lAvgPersonalPerformance: matchAverageStats.lossAvgPersonalPerformance,
      lAvgHLTVRating: matchAverageStats.lossAvgHTLVRating,
      lAvgKD: matchAverageStats.lossAvgKD,
      lAvgAim: matchAverageStats.lossAvgAim,
      lAvgUtility: matchAverageStats.lossAvgUtility,
    });
  }
  await savePlayerDetailsToDB(playerDetails);
} 