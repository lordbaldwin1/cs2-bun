import type { Request, Response } from "express";
import { config } from "../config";


export async function handlerMetrics(_: Request, res: Response) {
  const body = JSON.stringify(config.api.metrics);
  res.status(200).send(body);
}