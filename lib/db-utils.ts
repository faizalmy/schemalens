import { Pool, type PoolConfig } from "pg";

/**
 * Get Pool config for a user-provided connection string.
 * Strips unsupported URL params (channel_binding) and enables SSL
 * only when the connection string or URL suggests a hosted provider.
 */
export function getPoolConfig(connectionString: string): PoolConfig {
  // Strip channel_binding (Neon/PgBouncer param not supported by node pg)
  const cleanUrl = connectionString
    .replace(/[?&]channel_binding=require/, "")
    .replace(/\?$/, "");

  const config: PoolConfig = {
    connectionString: cleanUrl,
    max: 1,
    connectionTimeoutMillis: 15000,
  };

  // Enable SSL for hosted providers (non-localhost connections)
  // This avoids breaking local Docker/PG0 which don't support SSL
  const isLocal =
    cleanUrl.includes("localhost") ||
    cleanUrl.includes("127.0.0.1") ||
    cleanUrl.includes("::1");

  if (!isLocal) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}
