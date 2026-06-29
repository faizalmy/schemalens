/**
 * Normalize a PostgreSQL connection string.
 * - Neon requires SSL: auto-append sslmode=require if missing.
 */
export function normalizeConnectionString(connectionString: string): string {
  if (connectionString.includes("neon.tech") && !connectionString.includes("sslmode=")) {
    return connectionString + (connectionString.includes("?") ? "&sslmode=require" : "?sslmode=require");
  }
  return connectionString;
}
