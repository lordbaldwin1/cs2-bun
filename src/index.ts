import express from "express";
import { config } from "./config";
import { handlerReadiness } from "./api/readiness";
import { middlewareAPIHits, middlewareErrorHandler, middlewareLogResponses } from "./api/middleware";
import { startFetchingJob } from "./cron/fetch-and-scrape";
import { handlerMetrics } from "./api/metrics";

const app = express();
app.use(express.json());
app.use(middlewareLogResponses);
app.use(middlewareAPIHits)

app.get("/api/status", (req, res, next) => {
  Promise.resolve(handlerReadiness(req, res).catch(next));
});
app.get("api/metrics", (req, res, next) => {
  Promise.resolve(handlerMetrics(req, res).catch(next));
})

app.use(middlewareErrorHandler);

app.listen(config.api.port, async () => {
  console.log(`Server is running at ${config.api.baseURL}:${config.api.port}`);

  await startFetchingJob();
});
