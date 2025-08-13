import { getTeamStats } from "../db/queries/matches";
import type { TeamStats } from "../db/queries/matches";

type PearsonMeans = {
  lr: number;
  hr: number;
  kd: number;
  aim: number;
  util: number;
  won: number;
};
type PearsonCounts = Omit<PearsonMeans, "won">;

export async function getPearsonCorrelations() {
  const teamStats: TeamStats[] = await getTeamStats();
  const means: PearsonMeans = {
    lr: 0,
    hr: 0,
    kd: 0,
    aim: 0,
    util: 0,
    won: 0,
  };
  const counts: PearsonCounts = {
    lr: 0,
    hr: 0,
    kd: 0,
    aim: 0,
    util: 0,
  };
  for (const match of teamStats) {
    means.lr += match.leetify_rating ? match.leetify_rating : 0;
    counts.lr += match.leetify_rating ? 1 : 0;

    means.hr += match.hltv_rating ? match.hltv_rating : 0;
    counts.hr += match.hltv_rating ? 1 : 0;

    means.kd += match.kd ? match.kd : 0;
    counts.kd += match.kd ? 1 : 0;

    means.aim += match.aim ? match.aim : 0;
    counts.aim += match.aim ? 1 : 0;

    means.util += match.utility ? match.utility : 0;
    counts.util += match.utility ? 1 : 0;

    means.won += match.won;
  }
  means.lr = means.lr/counts.lr;
  means.hr = means.hr/counts.hr;
  means.kd = means.kd/counts.kd;
  means.aim = means.aim/counts.aim;
  means.util = means.util/counts.util;
  means.won = means.won/teamStats.length;

  let lrDenomX = 0, lrDenomY = 0, lrNumerator = 0;
  let hrDenomX = 0, hrDenomY = 0, hrNumerator = 0;
  let kdDenomX = 0, kdDenomY = 0, kdNumerator = 0;
  let aimDenomX = 0, aimDenomY = 0, aimNumerator = 0;
  let utilDenomX = 0, utilDenomY = 0, utilNumerator = 0;
  
  for (const match of teamStats) {
    const dy = match.won - means.won;
    
    if (match.leetify_rating !== null) {
        const dx = match.leetify_rating - means.lr;
        lrNumerator += dx * dy;
        lrDenomX += dx * dx;
        lrDenomY += dy * dy;
    }
    
    if (match.hltv_rating !== null) {
        const dx = match.hltv_rating - means.hr;
        hrNumerator += dx * dy;
        hrDenomX += dx * dx;
        hrDenomY += dy * dy;
    }
    
    if (match.kd !== null) {
        const dx = match.kd - means.kd;
        kdNumerator += dx * dy;
        kdDenomX += dx * dx;
        kdDenomY += dy * dy;
    }
    
    if (match.aim !== null) {
        const dx = match.aim - means.aim;
        aimNumerator += dx * dy;
        aimDenomX += dx * dx;
        aimDenomY += dy * dy;
    }
    
    if (match.utility !== null) {
        const dx = match.utility - means.util;
        utilNumerator += dx * dy;
        utilDenomX += dx * dx;
        utilDenomY += dy * dy;
    }
  }
  
  const correlations = {
    lr: lrDenomX > 0 && lrDenomY > 0 ? lrNumerator / Math.sqrt(lrDenomX * lrDenomY) : 0,
    hr: hrDenomX > 0 && hrDenomY > 0 ? hrNumerator / Math.sqrt(hrDenomX * hrDenomY) : 0,
    kd: kdDenomX > 0 && kdDenomY > 0 ? kdNumerator / Math.sqrt(kdDenomX * kdDenomY) : 0,
    aim: aimDenomX > 0 && aimDenomY > 0 ? aimNumerator / Math.sqrt(aimDenomX * aimDenomY) : 0,
    util: utilDenomX > 0 && utilDenomY > 0 ? utilNumerator / Math.sqrt(utilDenomX * utilDenomY) : 0,
  };

  // console.log(`${teamStats.length} matches used`)
  // console.log(correlations);
  
  return correlations;
}

getPearsonCorrelations();
