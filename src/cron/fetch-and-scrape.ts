import { Table } from "drizzle-orm";
import { config } from "../config";
import { savePlayer } from "../db/queries/players";
import { getBrowser } from "./browser";
import {
  buildFaceitLeaderboardURL,
  buildFaceitProfileURL,
  buildLeetifyMatchURL,
  buildLeetifyProfileURL,
} from "./helpers";
import { type BrowserContext, type Page } from "playwright";
import { saveMatchStats } from "../db/queries/matches";
import { savePlayerStats } from "../db/queries/player-stats";

type PlayerItem = {
  player_id: string;
  nickname: string;
  country: string;
  position: number;
  faceit_elo: number;
  game_skill_level: number;
};

type Players = {
  items: PlayerItem[];
  start: number;
  end: number;
};

type PlayerDetails = {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  steam_id_64: string;
  faceit_url: string;
};

type LeetifyAPIResponse = {
  games: {
    gameId: string;
  }[];
};

type PlayerStats = {
  name: string;
  leetifyRating: number | null;
  personalPerformance: number | null;
  hltvRating: number | null;
  kd: number | null;
  adr: number | null;
  aim: number | null;
  utility: number | null;
  won: boolean;
};

type Team = {
  players: PlayerStats[];
  won: boolean;
};

type Match = {
  teams: [Team, Team];
  matchURL: string;
};

type MatchAverageStats = {
  matchURL: string;
  winAvgLeetifyRating: number | null;
  winAvgPersonalPerformance: number | null;
  winAvgHTLVRating: number | null;
  winAvgKD: number | null;
  winAvgAim: number | null;
  winAvgUtility: number | null;
  lossAvgLeetifyRating: number | null;
  lossAvgPersonalPerformance: number | null;
  lossAvgHTLVRating: number | null;
  lossAvgKD: number | null;
  lossAvgAim: number | null;
  lossAvgUtility: number | null;
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
];

export async function startFaceitLeetifyFetching() {
  const playerIDs = await fetchFaceitPlayerIDs("EU", 1, 0);
  if (playerIDs.length === 0) {
    throw new Error("Fetch PlayerIDs failed");
  }

  const playerDetails = await fetchFaceitProfiles(playerIDs);
  if (playerDetails.length === 0) {
    throw new Error("Fetch Player Profiles failed");
  }

  await savePlayerDetailsToDB(playerDetails);

  const matchURLs: string[] = [];
  for (const player of playerDetails) {
    const ids = await fetchLeetifyMatchIDs(player.steam_id_64);
    for (const id of ids) {
      if (id.length < 36) {
        console.log(`Match id: ${id} is too short for player: ${player.steam_id_64}`);
        continue;
      }
      matchURLs.push(buildLeetifyMatchURL(id));
    }
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: { width: 1280, height: 800 },
  });

  for (const url of matchURLs) {
    const table = await scrapeMatch(context, url);
    console.log("Match scraped");
    const match: Match = await parseMatchTable(table, url);
    console.log("Match parsed");
    console.log("Match teams:", match.teams.map(team => ({
      won: team.won,
      playerCount: team.players.length,
      samplePlayer: team.players[0]
    })));
    
    const matchAverageStats = getAverageMatchStats(match);
    console.log("Match average stats computed");
    console.log("Match average stats:", matchAverageStats);
    
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
    console.log(`Match saved to DB: ${savedMatchAverageStats}`)
  }
}

async function parseMatchTable(matchTable: string[][], matchURL: string) {
  const gameStats: PlayerStats[] = [];
  
  for (let i = 0; i < matchTable.length; i++) {
    const row = matchTable[i];
    if (!row) continue;
    
    const p: PlayerStats = {
      name: row[0] && row[0] !== "" ? row[0] : "Unknown",
      leetifyRating:
        row[1] && !isNaN(parseFloat(row[1])) ? parseFloat(row[1]) : null,
      personalPerformance:
        row[2] && !isNaN(parseFloat(row[2])) ? parseFloat(row[2]) : null,
      hltvRating:
        row[3] && !isNaN(parseFloat(row[3])) ? parseFloat(row[3]) : null,
      kd: row[4] && !isNaN(parseFloat(row[4])) ? parseFloat(row[4]) : null,
      adr: row[5] && !isNaN(parseFloat(row[5])) ? parseFloat(row[5]) : null,
      aim: row[6] && !isNaN(parseFloat(row[6])) ? parseFloat(row[6]) : null,
      utility: row[7] && !isNaN(parseFloat(row[7])) ? parseFloat(row[7]) : null,
      won: i < 5 ? true : false,
    };
    
    await savePlayerStats({
      name: p.name,
      leetifyRating: p.leetifyRating,
      personalPerformance: p.personalPerformance,
      hltvRating: p.hltvRating,
      kd: p.kd,
      adr: p.adr,
      aim: p.aim,
      utility: p.utility,
      won: p.won,
    });
    
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
    matchURL: matchURL,
  } satisfies Match;
}

async function scrapeMatch(context: BrowserContext, matchURL: string) {
  try {
    const page: Page = await context.newPage();
    console.log("New page created");
    await page.goto(matchURL, { waitUntil: "domcontentloaded" });
    console.log(`Navigated to: ${matchURL}`);
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
  }
}

async function fetchLeetifyMatchIDs(steamID: string) {
  const URL = buildLeetifyProfileURL(steamID);

  const response = await fetch(URL, {
    method: "GET",
    headers: {
      "User-Agent": "cs2-bun",
    },
  });
  if (!response.ok) {
    console.error(`Request failed: ${response.status}, ${URL}`);
    return [];
  }

  const data = (await response.json()) as LeetifyAPIResponse;
  return data.games.slice(0, 5).map((game) => game.gameId);
}

async function savePlayerDetailsToDB(playerDetails: PlayerDetails[]) {
  for (const player of playerDetails) {
    const langAddedURL = player.faceit_url.replaceAll("{lang}", "en");
    const savedPlayer = await savePlayer({
      steamID: player.steam_id_64,
      name: player.nickname,
      country: player.country,
      faceitURL: langAddedURL,
      avatar: player.avatar,
    });
    if (savedPlayer?.name) {
      console.log(`Player saved: ${savedPlayer.name}`);
    }
  }
}

async function fetchFaceitPlayerIDs(
  region: string,
  limit: number,
  offset: number
) {
  const URL = buildFaceitLeaderboardURL(region, offset, limit);

  const response = await fetch(URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.api.faceitAPIKey}`,
      "User-Agent": "cs2-bun",
    },
  });
  if (!response.ok) {
    console.error(`Request failed: ${response.status}, ${URL}`);
    return [];
  }

  const players = (await response.json()) as Players;
  return players.items.map((item) => item.player_id);
}

async function fetchFaceitProfiles(playerID: string[]) {
  const playerDetails: PlayerDetails[] = [];
  for (const id of playerID) {
    const URL = buildFaceitProfileURL(id);

    const response = await fetch(URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.api.faceitAPIKey}`,
        "User-Agent": "cs2-bun",
      },
    });
    if (!response.ok) {
      console.error(`Request failed: ${response.status}, ${URL}`);
      return [];
    }
    const data = (await response.json()) as PlayerDetails;

    const playerDetail: PlayerDetails = {
      player_id: data.player_id,
      nickname: data.nickname,
      avatar: data.avatar,
      country: data.country,
      steam_id_64: data.steam_id_64,
      faceit_url: data.faceit_url,
    };
    if (playerDetail) {
      playerDetails.push(playerDetail);
    }
  }
  return playerDetails;
}

function getAverageMatchStats(match: Match): MatchAverageStats {
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

  // Process winning team (index 0)
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

  // Process losing team (index 1)
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
    winAvgLeetifyRating: winLeetifyCount > 0 ? winLeetify / winLeetifyCount : null,
    winAvgPersonalPerformance: winPersonalPerformanceCount > 0 ? winPersonalPerformance / winPersonalPerformanceCount : null,
    winAvgHTLVRating: winHLTVCount > 0 ? winHLTV / winHLTVCount : null,
    winAvgKD: winKDCount > 0 ? winKD / winKDCount : null,
    winAvgAim: winAimCount > 0 ? winAim / winAimCount : null,
    winAvgUtility: winUtilityCount > 0 ? winUtility / winUtilityCount : null,
    lossAvgLeetifyRating: lossLeetifyCount > 0 ? lossLeetify / lossLeetifyCount : null,
    lossAvgPersonalPerformance: lossPersonalPerformanceCount > 0 ? lossPersonalPerformance / lossPersonalPerformanceCount : null,
    lossAvgHTLVRating: lossHLTVCount > 0 ? lossHLTV / lossHLTVCount : null,
    lossAvgKD: lossKDCount > 0 ? lossKD / lossKDCount : null,
    lossAvgAim: lossAimCount > 0 ? lossAim / lossAimCount : null,
    lossAvgUtility: lossUtilityCount > 0 ? lossUtility / lossUtilityCount : null,
  };
}
