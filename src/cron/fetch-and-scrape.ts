import { config } from "../config";
import { savePlayer } from "../db/queries/players";
import { buildFaceitLeaderboardURL, buildFaceitProfileURL, buildLeetifyProfileURL } from "./helpers";

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

export async function startFaceitLeetifyFetching() {
  const playerIDs = await fetchFaceitPlayerIDs("EU", 5, 0);
  if (playerIDs.length === 0) {
    throw new Error("Fetch PlayerIDs failed");
  }
  console.log(playerIDs);

  const playerDetails = await fetchFaceitProfiles(playerIDs);
  if (playerDetails.length === 0) {
    throw new Error("Fetch Player Profiles failed");
  }
  console.log(playerDetails);

  await savePlayerDetailsToDB(playerDetails);

  const matchIDs: string[] = [];
  for (const player of playerDetails) {
    const ids = await fetchLeetifyMatchIDs(player.steam_id_64);
    for (const id of ids) {
      matchIDs.push(id);
    }
  }
  console.log(matchIDs.length);
}

async function fetchLeetifyMatchIDs(steamID: string) {
  const URL = buildLeetifyProfileURL(steamID);

  const response = await fetch(URL, {
    method: "GET",
    headers: {
      "User-Agent": "cs2-bun",
    }
  });
  if (!response.ok) {
    console.error(`Request failed: ${response.status}, ${URL}`)
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
