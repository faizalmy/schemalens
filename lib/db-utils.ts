import type { PoolConfig } from "pg";

/**
 * Get Pool config for a user-provided connection string.
 * Attempts SSL first (required by hosted providers like Neon, Supabase),
 * falls back to non-SSL if the server doesn't support it.
 */
export function getPoolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: 1,
    connectionTimeoutMillis: 15000,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}
