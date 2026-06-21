import { tool } from "ai";
import { z } from "zod";
import { Pool } from "pg";
import type { ExecuteSqlOutput, CheckSqlOutput } from "./types";
import { MAX_ROWS, QUERY_TIMEOUT_MS } from "./types";

/**
 * Hard block: checks if a query is read-only.
 *
 * Two layers:
 *   1. Regex — block known destructive keywords
 *   2. Multi-statement — block semicolons outside string literals
 */
function isReadOnly(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;

  // Strip string contents to avoid false positives on semicolons in strings
  const stripped = trimmed
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/E'[^']*'/g, "");

  // Block multi-statement queries (more than one semicolon = injection risk)
  const semiCount = (stripped.match(/;/g) || []).length;
  if (semiCount > 1) {
    return false;
  }

  // Only allow SELECT or WITH as statement prefixes
  const normalized = trimmed.toUpperCase().trimStart();
  const isAllowedPrefix =
    normalized.startsWith("SELECT") ||
    normalized.startsWith("WITH") ||
    normalized.startsWith("EXPLAIN") ||
    normalized.startsWith("SHOW");

  if (!isAllowedPrefix) {
    return false;
  }

  // Block destructive keywords anywhere in the query
  const unsafePattern =
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE|CALL|MERGE|COPY|REINDEX|VACUUM|CLUSTER|REFRESH|SECURITY|SET\s+ROLE|SET\s+SESSION\s+AUTHORIZATION|LISTEN|NOTIFY)\b/i;

  if (unsafePattern.test(trimmed)) {
    return false;
  }

  // Block EXPLAIN ANALYZE (which actually executes the plan)
  if (/EXPLAIN\s+ANALYZE\s+(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)/i.test(trimmed)) {
    return false;
  }

  return true;
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
    if (!isReadOnly(query)) {
      return {
        query,
        valid: false,
        warning:
          "Query contains destructive operations — only SELECT and WITH queries are allowed",
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
    const checks = [
      {
        pass: readOnlyCheck,
        message: readOnlyCheck
          ? "Query is read-only"
          : "Query contains destructive operations — rejected",
      },
      {
        pass: query.length < 5000,
        message:
          query.length < 5000
            ? "Query length OK"
            : "Query exceeds 5000 character limit",
      },
    ];

    // Multi-statement check
    const stripped = query
      .replace(/'[^']*'/g, "")
      .replace(/"[^"]*"/g, "");
    const semiCount = (stripped.match(/;/g) || []).length;
    checks.push({
      pass: semiCount <= 1,
      message:
        semiCount <= 1
          ? "Single-statement query"
          : `Multiple statements detected (${semiCount} semicolons) — injection risk`,
    });

    return {
      safe: checks.every((c) => c.pass),
      checks,
    };
  },
});

/**
 * execute_sql tool definition.
 * Runs the validated SQL query against the user's database.
 * Enforces read-only at TWO levels:
 *   1. Application-level regex check (above)
 *   2. PostgreSQL session-level read-only (SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY)
 *      — this is the HARD BLOCK that PostgreSQL itself enforces.
 */
export const executeSqlTool = (getConnectionString: () => string) =>
  tool({
    description:
      "Execute a SQL query against the database and return results. Only safe, read-only queries should be executed.",
    inputSchema: z.object({
      query: z.string().min(1).max(5000),
    }),
    execute: async ({
      query,
    }): Promise<ExecuteSqlOutput | { error: string }> => {
      // LAYER 1: Application-level check
      if (!isReadOnly(query)) {
        return {
          error:
            "HARD BLOCK: Destructive queries are not allowed. Only SELECT and WITH queries can be executed.",
        };
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

        // LAYER 2: PostgreSQL session-level read-only (HARD BLOCK)
        // Sets the default for all subsequent transactions in this session
        // PostgreSQL will reject ANY write attempt at the database level,
        // regardless of what the application-level regex might miss.
        await pool.query(
          "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY",
        );

        // Also set statement timeout
        await pool.query(
          `SET statement_timeout = '${QUERY_TIMEOUT_MS}ms'`,
        );

        const result = await pool.query({
          text: query,
          rowMode: "array",
        });

        const columns =
          result.fields?.map((f) => ({
            name: f.name,
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
        // Distinguish PG read-only violation from other errors
        const message =
          err.message?.replace(/^error:\s*/i, "") || "Query execution failed";

        // If PostgreSQL rejected the write, return a clear error
        if (
          err.message?.includes("read-only transaction") ||
          err.code === "25006"
        ) {
          return {
            error:
              "HARD BLOCK (PostgreSQL): Cannot execute write in a read-only transaction.",
          };
        }

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
