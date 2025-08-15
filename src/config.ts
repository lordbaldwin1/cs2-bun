import type { MigrationConfig } from "drizzle-orm/migrator";
import type { Metrics } from "./db/schema";
import { createMetric, getMetrics } from "./db/queries/metrics";

type Config = {
  api: APIConfig;
  db: DBConfig;
};

type APIConfig = {
  baseURL: string;
  port: number;
  platform: string;
  faceitAPIKey: string;
  metrics: Metrics | undefined;
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./drizzle",
};

export const config: Config = {
  api: {
    baseURL: envOrThrow("BASE_URL"),
    port: Number(envOrThrow("PORT")),
    platform: envOrThrow("PLATFORM"),
    faceitAPIKey: envOrThrow("FACEIT_API_KEY"),
    metrics: await getOrCreateMetrics(),
  },
  db: {
    url: envOrThrow("DB_FILE_NAME"),
    migrationConfig: migrationConfig,
  },
};

function envOrThrow(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// TODO:!!!!!
// we can't get metrics in the initialization of config because
// we are also creating the db connection and migrating in config
// initialization. This means when we try to initialize the metrics
// field, we don't have the db connection yet
//
// Solution: let's start with metrics undefined and then initialize it in getOrCreateMetrics(). In the function
// fetch the data and then set config.api.metrics to it!
async function getOrCreateMetrics() {
  const metric = await getMetrics();
  if (!metric) {
    const newMetric = await createMetric({
      apiHits: 0,
    });
    return newMetric;
  }
  return metric;
}

