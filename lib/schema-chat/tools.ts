import { tool } from "ai";
import { z } from "zod";
import { Pool } from "pg";
import type { ExecuteSqlOutput, CheckSqlOutput } from "./types";
import { MAX_ROWS, QUERY_TIMEOUT_MS } from "./types";

/**
 * Check if a SQL query is read-only (safe).
 * Blocks: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
 */
function isReadOnly(query: string): boolean {
  const normalized = query.trim().toUpperCase();
  // Allow only SELECT, WITH (CTE), EXPLAIN, SET, SHOW
  const unsafePattern =
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i;
  return !unsafePattern.test(normalized);
}

/**
 * generate_sql tool definition.
 * The AI passes the SQL it wrote as the `query` parameter.
 * This tool validates basic syntax and returns it formatted.
 */
export const generateSqlTool = tool({
  description:
    "Write a PostgreSQL query. Pass your generated SQL as the `query` parameter. Returns the formatted SQL.",
  inputSchema: z.object({
    query: z.string().min(1, "Query cannot be empty").max(5000),
    explanation: z
      .string()
      .optional()
      .describe("Brief explanation of what this query does"),
  }),
  execute: async ({ query }) => {
    // Basic validation: must contain SELECT or WITH
    const normalized = query.trim().toUpperCase();
    if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH") && !normalized.startsWith("EXPLAIN") && !normalized.startsWith("SET") && !normalized.startsWith("SHOW")) {
      return {
        query,
        valid: false,
        warning:
          "Query doesn't start with SELECT or WITH — may not be a valid data query",
      };
    }
    return { query, valid: true };
  },
});

/**
 * check_sql tool definition.
 * Validates the SQL query is safe to execute.
 */
export const checkSqlTool = tool({
  description:
    "Validate a SQL query is safe (read-only) before executing it. Returns safety check results.",
  inputSchema: z.object({
    query: z.string().min(1).max(5000),
  }),
  execute: async ({ query }): Promise<CheckSqlOutput> => {
    const readOnlyCheck = isReadOnly(query);
    return {
      safe: readOnlyCheck,
      checks: [
        {
          pass: readOnlyCheck,
          message: readOnlyCheck
            ? "Query is read-only"
            : "Query contains destructive operations (INSERT/UPDATE/DELETE/DROP/ALTER)",
        },
        {
          pass: query.length < 5000,
          message:
            query.length < 5000
              ? "Query length OK"
              : "Query exceeds 5000 character limit",
        },
      ],
    };
  },
});

/**
 * execute_sql tool definition.
 * Runs the validated SQL query against the user's database connection.
 */
export const executeSqlTool = (getConnectionString: () => string) =>
  tool({
    description:
      "Execute a SQL query against the database and return results. Only safe, read-only queries should be executed.",
    inputSchema: z.object({
      query: z.string().min(1).max(5000),
    }),
    execute: async ({ query }): Promise<ExecuteSqlOutput | { error: string }> => {
      // Safety check (double-check)
      if (!isReadOnly(query)) {
        return { error: "Destructive queries are not allowed" };
      }

      let pool: Pool | null = null;
      try {
        const connectionString = getConnectionString();
        if (!connectionString) {
          return { error: "No database connection available" };
        }

        pool = new Pool({
          connectionString,
          max: 1,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          statement_timeout: QUERY_TIMEOUT_MS,
        });

        // Set statement timeout for this session
        await pool.query(`SET statement_timeout = '${QUERY_TIMEOUT_MS}ms'`);

        const result = await pool.query({
          text: query,
          rowMode: "array",
        });

        const columns =
          result.fields?.map((f) => ({
            name: f.name,
            // Map type OID to readable name
            type: f.dataTypeID.toString(),
          })) || [];

        const rows = (result.rows || []).slice(0, MAX_ROWS);
        const totalRowCount = result.rows?.length || 0;

        return {
          columns,
          rows: rows as unknown[][],
          rowCount: totalRowCount,
          truncated: totalRowCount > MAX_ROWS,
        };
      } catch (err: any) {
        // Return error info so the agent can retry
        const message =
          err.message?.replace(/^error:\s*/i, "") || "Query execution failed";
        return { error: message };
      } finally {
        if (pool) {
          try {
            await pool.end();
          } catch {
            // ignore close errors
          }
        }
      }
    },
  });
