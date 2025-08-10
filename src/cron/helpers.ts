const FACEIT_LEADERBOARD_URL = "https://open.faceit.com/data/v4/rankings/games/cs2/regions/";
const FACEIT_PROFILE_URL = "https://open.faceit.com/data/v4/players/";
const MAX_LEADERBOARD_LIMIT = 50;

const LEETIFY_PROFILE_URL = "https://api.cs-prod.leetify.com/api/profile/id/";
const LEETIFY_MATCH_URL = "https://leetify.com/app/match-details/";

export function buildFaceitLeaderboardURL(region: string, offset: number, limit: number) {
  const fetchLimit = clamp(1, MAX_LEADERBOARD_LIMIT, limit);
  return `${FACEIT_LEADERBOARD_URL}${region}?offset=${offset}&limit=${fetchLimit}`;
}

export function buildFaceitProfileURL(playerID: string) {
  return `${FACEIT_PROFILE_URL}${playerID}`;
}

export function buildLeetifyProfileURL(playerID: string) {
  return `${LEETIFY_PROFILE_URL}${playerID}`;
}

export function buildLeetifyMatchURL(matchID: string) {
  return `${LEETIFY_MATCH_URL}${matchID}`
}

function clamp(lower: number, upper: number, value: number) {
  return Math.max(lower, Math.min(upper, value));
}