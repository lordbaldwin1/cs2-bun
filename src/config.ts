import type { MigrationConfig } from "drizzle-orm/migrator";
import type { Metrics } from "./db/schema";
import { createMetric, getMetrics } from "./db/queries/metrics";
import { randomUUIDv7 } from "bun";

type Config = {
  api: APIConfig;
  db: DBConfig;
};

type APIConfig = {
  baseURL: string;
  port: number;
  platform: string;
  faceitAPIKey: string;
  metrics: Metrics;
};

type DBConfig = {
  url: string;
};


export const config: Config = {
  api: {
    baseURL: envOrThrow("BASE_URL"),
    port: Number(envOrThrow("PORT")),
    platform: envOrThrow("PLATFORM"),
    faceitAPIKey: envOrThrow("FACEIT_API_KEY"),
    metrics: { name: randomUUIDv7(), apiHits: 0 },
  },
  db: {
    url: envOrThrow("DB_FILE_NAME"),
  },
};

function envOrThrow(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

export async function getOrCreateMetrics() {
  const metric = await getMetrics();
  if (!metric) {
    config.api.metrics = {
      name: randomUUIDv7(),
      apiHits: 0,
    }
    return;
  }
  config.api.metrics = metric;
}

