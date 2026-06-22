import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Aurora Serverless v2 requires SSL for external connections (Vercel Lambda)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl:
    process.env.VERCEL_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

export const db = drizzle(pool, { schema });
