import type { Request, Response } from "express";
import { config } from "../config";


export async function handlerMetrics(_: Request, res: Response) {
  res.status(200).send(config.api.metrics.apiHits);
}