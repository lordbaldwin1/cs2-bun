import { config } from "../config";
import { savePlayer } from "../db/queries/players";
import { getBrowser } from "./browser";
import {
  buildFaceitLeaderboardURL,
  buildFaceitProfileURL,
  buildLeetifyMatchURL,
  buildLeetifyProfileURL,
} from "./helpers";
import { type BrowserContext } from "playwright";

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
  const context = await browser.newContext();

  try {
    const matches = await scrapeLeetifyMatches(context, matchURLs);
    const avgMatchStats = getAverageMatchStats(matches);
    await saveAverageMatchStats(avgMatchStats);
  } catch (error) {
    console.error("Error scraping Leetify matches:", error);
  } finally {
    await context.close();
  }
}

async function saveAverageMatchStats(matches: MatchAverageStats[]) {

}

async function scrapeLeetifyMatches(
  context: BrowserContext,
  matchURLs: string[]
) {
  const results: ScrapedMatchData[] = [];

  for (const url of matchURLs) {
    try {
      const page = await context.newPage();

      // Block images/CSS/fonts
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (["image", "stylesheet", "font"].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForSelector("table", { state: "visible", timeout: 10000 });
      await page.waitForTimeout(1000);

      const matchResult = await page.textContent("div.phrase");

      if (matchResult?.trim() === "TIE") {
        console.log(`Tie detected, skipping: ${url}`);
        await page.close();
        continue;
      }

      const matchData = await page.evaluate(() => {
        // get all rows
        const rows = document.querySelectorAll("table tbody tr");

        // turn rows into an array, and then make an array
        // out of the cells of the table
        // array of arrays!
        return Array.from(rows).map((row) => {
          const cells = row.querySelectorAll("td");

          return Array.from(cells).map(
            (cell) => cell.textContent?.trim() || ""
          );
        });
      });

      await page.close();

      console.log("Data scraped:");
      console.log(matchData);
      results.push({
        data: matchData,
        url,
      });
    } catch (err: unknown) {
      console.error(`Error scraping ${url}:`, err);
      results.push({ data: [], url });
    }
  }

  const matches: Match[] = [];
  for (const match of results) {
    const validMatches: string[][] = [];
    for (const player of match.data) {
      if (player.length === 0) {
        continue;
      }
      validMatches.push(player);
    }

    if (validMatches.length < 10) {
      console.error("Skipping match, less than 10 players:", match.url);
      continue;
    }

    const winPlayers: PlayerStats[] = [];
    const losePlayers: PlayerStats[] = [];
    validMatches.slice(0, 10).forEach((player, i) => {
      const p: PlayerStats = {
        name: player[0] ?? "",
        leetifyRating: player[1] ?? "",
        personalPerformance: player[2] ?? "",
        hltvRating: player[3] ?? "",
        kd: player[4] ?? "",
        adr: player[5] ?? "",
        aim: player[6] ?? "",
        utility: player[7] ?? "",
      };

      if (i < 5) {
        winPlayers.push(p);
      } else {
        losePlayers.push(p);
      }

      const winTeam: Team = { players: winPlayers, won: true };
      const loseTeam: Team = { players: losePlayers, won: false };

      matches.push({
        teams: [winTeam, loseTeam],
        matchURL: match.url,
      });
    });
  }
  return matches;
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
