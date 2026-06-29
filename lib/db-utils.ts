import type { PoolConfig } from "pg";

/**
 * Get Pool config for a user-provided connection string.
 * Strips unsupported URL params and enables SSL for hosted providers.
 */
export function getPoolConfig(connectionString: string): PoolConfig {
  // Strip channel_binding (Neon/PgBouncer param not supported by node pg)
  const cleanUrl = connectionString
    .replace(/[?&]channel_binding=require/, "")
    .replace(/\?$/, "");

  return {
    connectionString: cleanUrl,
    max: 1,
    connectionTimeoutMillis: 15000,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}
