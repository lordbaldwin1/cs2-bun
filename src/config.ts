import type { MigrationConfig } from "drizzle-orm/migrator";

type Config = {
  api: APIConfig;
  db: DBConfig;
};

type APIConfig = {
  baseURL: string;
  port: number;
  platform: string;
  faceitAPIKey: string;
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