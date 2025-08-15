import { getPearsonCorrelations, type PearsonCorrelations } from "./calculations/pearson"
import { calculatePlayerPoints, type Scatter } from "./calculations/scatter";

type Stats = {
  pearson: PearsonCorrelations;
  scatter: Scatter[];
}

export const stats: Stats = {
  pearson: await getPearsonCorrelations(),
  scatter: await calculatePlayerPoints(),
}