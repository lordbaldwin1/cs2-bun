import type { Request, Response } from "express";
import { db } from "../db";
import { players } from "../db/schema";
import { count, desc } from "drizzle-orm";

export async function handlerGetPlayers(req: Request, res: Response) {
  const offset = parseInt(req.query.offset as string) || 0;
  const playerList = await db
    .select()
    .from(players)
    .limit(50)
    .orderBy(desc(players.createdAt))
    .offset(offset);
  if (!playerList) {
    throw new Error("No players found");
  }
  res.status(200).send(playerList);
}

export async function handlerGetPlayerCount(req: Request, res: Response) {
  const numPlayers = await db.select({ value: count() }).from(players);
  res.status(200).send({ count: numPlayers[0]?.value });
}
