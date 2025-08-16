import type { Request, Response } from "express";
import { stats } from "../stats";


export async function handlerStats(_: Request, res: Response) {
  if (!stats) {
    throw new Error("Failed to fetch stats.");
  }
  res.status(200).send(stats);
}