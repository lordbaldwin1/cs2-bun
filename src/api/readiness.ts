import type { Request, Response } from "express";

export async function handlerReadiness(_: Request, res: Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send("OK");
  res.end();
}