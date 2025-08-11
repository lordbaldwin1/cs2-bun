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
  leetifyRating: string;
  personalPerformance: string;
  hltvRating: string;
  kd: string;
  adr: string;
  aim: string;
  utility: string;
};

type Team = {
  players: PlayerStats[];
  won: boolean;
};

type Match = {
  teams: [Team, Team];
  matchURL: string;
};

type ScrapedMatchData = {
  data: string[][];
  url: string;
};

type MatchAverageStats = {
  matchURL: string;
  winAvgLeetifyRating: number;
  winAvgPersonalPerformance: number;
  winAvgHTLVRating: number;
  winAvgKD: number;
  winAvgAim: number;
  winAvgUtility: number;
  lossAvgLeetifyRating: number;
  lossAvgPersonalPerformance: number;
  lossAvgHTLVRating: number;
  lossAvgKD: number;
  lossAvgAim: number;
  lossAvgUtility: number;
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
];
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function startFaceitLeetifyFetching() {
  const playerIDs = await fetchFaceitPlayerIDs("EU", 5, 0);
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
      matchURLs.push(buildLeetifyMatchURL(id));
    }
  }
  console.log(matchURLs.slice(0, 5));

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: { width: 1280, height: 800 },
  });

  const table = await scrapeMatch(context, matchURLs[0]!);
  for (const row of table) {
    console.log(row);
  }
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
        })
        allData.push(builtRow);
      })
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

function getAverageMatchStats(matches: Match[]): MatchAverageStats[] {
  const matchesAverageStats: MatchAverageStats[] = [];
  const teamSize = 5;

  for (const match of matches) {
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

    let skipMatch = false;

    // Process winning team (index 0)
    for (const player of match.teams[0].players) {
      const lr = parseFloat(player.leetifyRating);
      if (isNaN(lr)) {
        skipMatch = true;
        break;
      }
      winLeetify += lr;

      const pp = parseFloat(player.personalPerformance);
      if (isNaN(pp)) {
        skipMatch = true;
        break;
      }
      winPersonalPerformance += pp;

      const hr = parseFloat(player.hltvRating);
      if (isNaN(hr)) {
        skipMatch = true;
        break;
      }
      winHLTV += hr;

      const kdr = parseFloat(player.kd);
      if (isNaN(kdr)) {
        skipMatch = true;
        break;
      }
      winKD += kdr;

      const aim = parseFloat(player.aim);
      if (isNaN(aim)) {
        skipMatch = true;
        break;
      }
      winAim += aim;

      const util = parseFloat(player.utility);
      if (isNaN(util)) {
        skipMatch = true;
        break;
      }
      winUtility += util;
    }

    if (skipMatch) {
      continue;
    }

    // Process losing team (index 1)
    for (const player of match.teams[1].players) {
      const lr = parseFloat(player.leetifyRating);
      if (isNaN(lr)) {
        skipMatch = true;
        break;
      }
      lossLeetify += lr;

      const pp = parseFloat(player.personalPerformance);
      if (isNaN(pp)) {
        skipMatch = true;
        break;
      }
      lossPersonalPerformance += pp;

      const hr = parseFloat(player.hltvRating);
      if (isNaN(hr)) {
        skipMatch = true;
        break;
      }
      lossHLTV += hr;

      const kdr = parseFloat(player.kd);
      if (isNaN(kdr)) {
        skipMatch = true;
        break;
      }
      lossKD += kdr;

      const aim = parseFloat(player.aim);
      if (isNaN(aim)) {
        skipMatch = true;
        break;
      }
      lossAim += aim;

      const util = parseFloat(player.utility);
      if (isNaN(util)) {
        skipMatch = true;
        break;
      }
      lossUtility += util;
    }

    if (skipMatch) {
      console.log("Skipping match");
      continue;
    }

    matchesAverageStats.push({
      matchURL: match.matchURL,
      winAvgLeetifyRating: winLeetify / teamSize,
      winAvgPersonalPerformance: winPersonalPerformance / teamSize,
      winAvgHTLVRating: winHLTV / teamSize,
      winAvgKD: winKD / teamSize,
      winAvgAim: winAim / teamSize,
      winAvgUtility: winUtility / teamSize,
      lossAvgLeetifyRating: lossLeetify / teamSize,
      lossAvgPersonalPerformance: lossPersonalPerformance / teamSize,
      lossAvgHTLVRating: lossHLTV / teamSize,
      lossAvgKD: lossKD / teamSize,
      lossAvgAim: lossAim / teamSize,
      lossAvgUtility: lossUtility / teamSize,
    });
  }

  return matchesAverageStats;
}
