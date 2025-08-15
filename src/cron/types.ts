export type PlayerItem = {
  player_id: string;
  nickname: string;
  country: string;
  position: number;
  faceit_elo: number;
  game_skill_level: number;
};

export type Players = {
  items: PlayerItem[];
  start: number;
  end: number;
};

export type PlayerDetails = {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  steam_id_64: string;
  faceit_url: string;
};

export type LeetifyAPIResponse = {
  isSensitiveDataVisible: boolean;
  games: {
    gameId: string;
  }[];
};

export type PlayerStats = {
  steamID: string;
  leetifyRating: number | null;
  personalPerformance: number | null;
  hltvRating: number | null;
  kd: number | null;
  adr: number | null;
  aim: number | null;
  utility: number | null;
  won: boolean;
};

export type Team = {
  players: PlayerStats[];
  won: boolean;
};

export type Match = {
  teams: [Team, Team];
  matchURL: string;
};

export type MatchAverageStats = {
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

export type MatchURLAndSteamID = {
  url: string;
  steamID: string;
};