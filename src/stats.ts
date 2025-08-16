import { getPearsonCorrelations, type PearsonCorrelations } from "./calculations/pearson"
import { calculatePlayerPoints, type Scatter } from "./calculations/scatter";

export type Stats = {
  pearson: PearsonCorrelations;
  scatter: Scatter[];
}

export const stats: Stats = {
  pearson: await getPearsonCorrelations(),
  scatter: await calculatePlayerPoints(),
}