import { config } from "../config";
import { savePlayer } from "../db/queries/players";
import type { PlayerDetails, Players } from "./types";

const FACEIT_LEADERBOARD_URL = "https://open.faceit.com/data/v4/rankings/games/cs2/regions/";
const FACEIT_PROFILE_URL = "https://open.faceit.com/data/v4/players/";
const MAX_LEADERBOARD_LIMIT = 50;

export async function fetchFaceitPlayerIDs(
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

export async function fetchFaceitProfiles(playerID: string[]) {
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

export async function savePlayerDetailsToDB(playerDetails: PlayerDetails[]) {
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

function buildFaceitLeaderboardURL(region: string, offset: number, limit: number) {
  const fetchLimit = clamp(1, MAX_LEADERBOARD_LIMIT, limit);
  return `${FACEIT_LEADERBOARD_URL}${region}?offset=${offset}&limit=${fetchLimit}`;
}

function buildFaceitProfileURL(playerID: string) {
  return `${FACEIT_PROFILE_URL}${playerID}`;
}

function clamp(lower: number, upper: number, value: number) {
  return Math.max(lower, Math.min(upper, value));
}
