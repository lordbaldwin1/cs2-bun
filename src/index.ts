import express, { application } from "express";
import { config, getOrCreateMetrics } from "./config";
import { handlerReadiness } from "./api/readiness";
import { middlewareAPIHits, middlewareErrorHandler, middlewareLogResponses } from "./api/middleware";
import { startFetchingJob } from "./cron/fetch-and-scrape";
import { handlerMetrics } from "./api/metrics";
import { saveMetrics } from "./db/queries/metrics";

const app = express();
app.use(express.json());
app.use(middlewareLogResponses);
app.use(middlewareAPIHits)

app.get("/api/status", (req, res, next) => {
  Promise.resolve(handlerReadiness(req, res).catch(next));
});
app.get("/api/metrics", (req, res, next) => {
  Promise.resolve(handlerMetrics(req, res).catch(next));
})

app.use(middlewareErrorHandler);

const server = app.listen(config.api.port, async () => {
  console.log(`Server is running at ${config.api.baseURL}:${config.api.port}`);

  // await startFetchingJob();
  await getOrCreateMetrics();

  const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} signal received: starting graceful shutdown`);
    
    const metrics = await saveMetrics({
      name: config.api.metrics.name,
      apiHits: config.api.metrics?.apiHits,
   })
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});
