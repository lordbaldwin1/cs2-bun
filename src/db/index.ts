import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { config } from '../config';

const sqlite = new Database(process.env.DB_FILE_NAME!);
export const db = drizzle({ client: sqlite });

// run migrations on startup
migrate(db, config.db.migrationConfig);
console.log("DB schema is up to date!")
