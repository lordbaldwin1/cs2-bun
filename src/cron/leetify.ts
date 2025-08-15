import { type BrowserContext, type Page } from "playwright";
import { saveMatchStats } from "../db/queries/matches";
import { savePlayerStats } from "../db/queries/player-stats";
import type { LeetifyAPIResponse, Match, MatchAverageStats, MatchURLAndSteamID, PlayerStats, Team } from "./types";

const LEETIFY_PROFILE_URL = "https://api.cs-prod.leetify.com/api/profile/id/";
const LEETIFY_MATCH_URL = "https://leetify.com/app/match-details/";

export async function fetchLeetifyMatchIDs(steamID: string) {
  const URL = buildLeetifyProfileURL(steamID);

  const response = await fetch(URL, {
    method: "GET",
    headers: {
      "User-Agent": "cs2-bun",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    console.error(`Request failed: ${response.status}, ${URL}`);
    return [];
  }

  const data = (await response.json()) as LeetifyAPIResponse;
  if (!data.isSensitiveDataVisible) {
    return [];
  }
  return data.games.slice(0, 30).map((game) => game.gameId);
}

export async function scrapeMatch(context: BrowserContext, match: MatchURLAndSteamID) {
  let page: Page | null = null;
  try {
    page = await context.newPage();
    console.log("New page created");
    await page.goto(match.url, { waitUntil: "domcontentloaded" });
    console.log(`Navigated to: ${match.url}`);
    await page.waitForSelector("table");
    console.log("Table selector visible");

    const tableData = await page.evaluate(() => {
      console.log("Evaluating page");
      const rows = Array.from(
        document.querySelectorAll("app-scoreboard-table-row")
      );
      const allData: string[][] = [];

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const builtRow: string[] = [];

        cells.forEach((cell, i) => {
          if (i === 0) {
            // Extract Steam ID from the href attribute first
            const profileLink = cell.querySelector("a[href*='/app/profile/']");
            if (profileLink) {
              const href = profileLink.getAttribute("href");
              if (href) {
                const steamID = href.split("/").pop();
                if (steamID) {
                  builtRow.push(steamID); // Steam ID is now first column
                }
              }
            }

            // Then add the player name
            const name =
              cell.querySelector(".text-truncate")?.textContent?.trim() ||
              cell.textContent?.trim() ||
              "";
            builtRow.push(name);
          } else {
            builtRow.push(cell.textContent?.trim() || "");
          }
        });
        allData.push(builtRow);
      });
      return allData;
    });
    return tableData;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
      return [];
    }
    console.error("Error: unknown error occurred");
    return [];
  } finally {
    if (page) {
      await page.close();
      console.log("Page closed");
    }
  }
}

export async function parseMatchTable(
  matchTable: string[][],
  matchURLAndSteamID: MatchURLAndSteamID
) {
  const gameStats: PlayerStats[] = [];

  for (let i = 0; i < matchTable.length; i++) {
    const row = matchTable[i];
    if (!row) continue;

    const p: PlayerStats = {
      steamID: row[0] && row[0] !== "" ? row[0] : "Unknown",
      leetifyRating:
        row[2] && !isNaN(parseFloat(row[2])) ? parseFloat(row[2]) : null,
      personalPerformance:
        row[3] && !isNaN(parseFloat(row[3])) ? parseFloat(row[3]) : null,
      hltvRating:
        row[4] && !isNaN(parseFloat(row[4])) ? parseFloat(row[4]) : null,
      kd: row[5] && !isNaN(parseFloat(row[5])) ? parseFloat(row[5]) : null,
      adr: row[6] && !isNaN(parseFloat(row[6])) ? parseFloat(row[6]) : null,
      aim: row[7] && !isNaN(parseFloat(row[7])) ? parseFloat(row[7]) : null,
      utility: row[8] && !isNaN(parseFloat(row[8])) ? parseFloat(row[8]) : null,
      won: i < 5 ? true : false,
    };

    if (matchURLAndSteamID.steamID === row[0]) {
      await savePlayerStats({
        steamID: row[0],
        leetifyRating: p.leetifyRating,
        personalPerformance: p.personalPerformance,
        hltvRating: p.hltvRating,
        kd: p.kd,
        adr: p.adr,
        aim: p.aim,
        utility: p.utility,
        won: p.won,
      });
    }

    gameStats.push(p);
  }

  const winningTeam: Team = {
    players: gameStats.slice(0, 5),
    won: true,
  };
  const losingTeam: Team = {
    players: gameStats.slice(5, 10),
    won: false,
  };
  return {
    teams: [winningTeam, losingTeam],
    matchURL: matchURLAndSteamID.url,
  } satisfies Match;
}

export function getAverageMatchStats(match: Match): MatchAverageStats {
  let winLeetify = 0,
    winPersonalPerformance = 0,
    winHLTV = 0,
    winKD = 0,
    winAim = 0,
    winUtility = 0;

  let lossLeetify = 0,
    lossPersonalPerformance = 0,
    lossHLTV = 0,
    lossKD = 0,
    lossAim = 0,
    lossUtility = 0;

  let winLeetifyCount = 0,
    winPersonalPerformanceCount = 0,
    winHLTVCount = 0,
    winKDCount = 0,
    winAimCount = 0,
    winUtilityCount = 0;

  let lossLeetifyCount = 0,
    lossPersonalPerformanceCount = 0,
    lossHLTVCount = 0,
    lossKDCount = 0,
    lossAimCount = 0,
    lossUtilityCount = 0;

  for (const player of match.teams[0].players) {
    if (player.leetifyRating !== null) {
      winLeetify += player.leetifyRating;
      winLeetifyCount++;
    }

    if (player.personalPerformance !== null) {
      winPersonalPerformance += player.personalPerformance;
      winPersonalPerformanceCount++;
    }

    if (player.hltvRating !== null) {
      winHLTV += player.hltvRating;
      winHLTVCount++;
    }

    if (player.kd !== null) {
      winKD += player.kd;
      winKDCount++;
    }

    if (player.aim !== null) {
      winAim += player.aim;
      winAimCount++;
    }

    if (player.utility !== null) {
      winUtility += player.utility;
      winUtilityCount++;
    }
  }

  for (const player of match.teams[1].players) {
    if (player.leetifyRating !== null) {
      lossLeetify += player.leetifyRating;
      lossLeetifyCount++;
    }

    if (player.personalPerformance !== null) {
      lossPersonalPerformance += player.personalPerformance;
      lossPersonalPerformanceCount++;
    }

    if (player.hltvRating !== null) {
      lossHLTV += player.hltvRating;
      lossHLTVCount++;
    }

    if (player.kd !== null) {
      lossKD += player.kd;
      lossKDCount++;
    }

    if (player.aim !== null) {
      lossAim += player.aim;
      lossAimCount++;
    }

    if (player.utility !== null) {
      lossUtility += player.utility;
      lossUtilityCount++;
    }
  }

  return {
    matchURL: match.matchURL,
    winAvgLeetifyRating:
      winLeetifyCount > 0 ? winLeetify / winLeetifyCount : null,
    winAvgPersonalPerformance:
      winPersonalPerformanceCount > 0
        ? winPersonalPerformance / winPersonalPerformanceCount
        : null,
    winAvgHTLVRating: winHLTVCount > 0 ? winHLTV / winHLTVCount : null,
    winAvgKD: winKDCount > 0 ? winKD / winKDCount : null,
    winAvgAim: winAimCount > 0 ? winAim / winAimCount : null,
    winAvgUtility: winUtilityCount > 0 ? winUtility / winUtilityCount : null,
    lossAvgLeetifyRating:
      lossLeetifyCount > 0 ? lossLeetify / lossLeetifyCount : null,
    lossAvgPersonalPerformance:
      lossPersonalPerformanceCount > 0
        ? lossPersonalPerformance / lossPersonalPerformanceCount
        : null,
    lossAvgHTLVRating: lossHLTVCount > 0 ? lossHLTV / lossHLTVCount : null,
    lossAvgKD: lossKDCount > 0 ? lossKD / lossKDCount : null,
    lossAvgAim: lossAimCount > 0 ? lossAim / lossAimCount : null,
    lossAvgUtility:
      lossUtilityCount > 0 ? lossUtility / lossUtilityCount : null,
  };
}

function buildLeetifyProfileURL(playerID: string) {
  return `${LEETIFY_PROFILE_URL}${playerID}`;
}

export function buildLeetifyMatchURL(matchID: string) {
  return `${LEETIFY_MATCH_URL}${matchID}`
}
