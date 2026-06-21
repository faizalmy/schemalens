import type { ReactNode } from "react";
import type { ParsedSchema, TableInfo } from "@/lib/types";
import { Search, Link2, Lightbulb } from "lucide-react";
import { MAX_SCHEMA_TABLES } from "./types";

/**
 * Build a concise schema context string for the AI system prompt.
 * Truncates to MAX_SCHEMA_TABLES tables if there are more than that many.
 */
export function buildSchemaContext(schema: ParsedSchema): string {
  const tables = schema.tables.slice(0, MAX_SCHEMA_TABLES);

  const parts: string[] = [];

  for (const table of tables) {
    const cols = table.columns
      .map((c) => {
        const hints = [
          c.primaryKey && "PK",
          c.unique && "UQ",
          !c.nullable && "NN",
          c.defaultValue && `default(${c.defaultValue})`,
        ]
          .filter(Boolean)
          .join(" ");
        return `  - ${c.name} ${c.type}${hints ? ` [${hints}]` : ""}`;
      })
      .join("\n");

    const fks = schema.relations
      .filter((r) => r.fromTable === table.name)
      .map((r) => `  -> ${r.toTable}.${r.toColumn}`)
      .join("\n");

    parts.push(`Table: ${table.name}${cols}\n${fks ? `FKs:\n${fks}` : ""}`);
  }

  if (schema.tables.length > MAX_SCHEMA_TABLES) {
    parts.push(
      `\n... and ${schema.tables.length - MAX_SCHEMA_TABLES} more tables (truncated)`,
    );
  }

  return `## Database Schema\n\n${parts.join("\n\n")}`;
}

/**
 * Build a user-friendly table summary for the UI (table names + counts).
 */
export function buildSchemaSummary(
  tables: TableInfo[],
): { label: string; icon: ReactNode }[] {
  const suggestions: { label: string; icon: ReactNode }[] = [];

  if (tables.length === 0) return suggestions;

  // First table suggestions
  const first = tables[0];
  suggestions.push({
    label: `Show first 10 rows of ${first.name}...`,
    icon: <Search className="w-4 h-4" />,
  });

  if (tables.length >= 2) {
    const second = tables[1];
    suggestions.push({
      label: `Join ${first.name} and ${second.name}...`,
      icon: <Link2 className="w-4 h-4" />,
    });
  }

  if (first.columns.length > 3) {
    suggestions.push({
      label: `What columns in ${first.name} need indexing?`,
      icon: <Lightbulb className="w-4 h-4" />,
    });
  }

  return suggestions;
}
