import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Only connect to the database if DATABASE_URL is provided.
// When running locally without a database, MemStorage is used instead (see storage.ts).
function createDb() {
  if (!process.env.DATABASE_URL) return null as any;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("ssl=true") ? { rejectUnauthorized: false } : undefined,
  });
  return drizzle(pool, { schema });
}

export const db = createDb();
