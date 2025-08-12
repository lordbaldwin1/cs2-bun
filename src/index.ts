import express from "express";
import { config } from "./config";
import { handlerReadiness } from "./api/readiness";
import { middlewareErrorHandler } from "./api/middleware";
import { startFetchingJob } from "./cron/fetch-and-scrape";

const app = express();
app.use(express.json());

app.get("/api/healthz", (req, res, next) => {
  Promise.resolve(handlerReadiness(req, res).catch(next));
});

app.use(middlewareErrorHandler);

app.listen(config.api.port, async () => {
  console.log(`Server is running at ${config.api.baseURL}:${config.api.port}`);

  await startFetchingJob();
});
