import type { ReactNode } from "react";
import type { ParsedSchema, TableInfo } from "@/lib/types";
import { Search, Link2, Lightbulb, SearchX, ArrowUpDown, Ban, List, ListChecks, Table2, Clock, FileCheck, KeyRound, FileText, Minimize2, Hash } from "lucide-react";
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
 * Generates smart, contextual question buttons based on actual schema data.
 */
export function buildSchemaSummary(
  tables: TableInfo[],
): { label: string; icon: ReactNode }[] {
  const suggestions: { label: string; icon: ReactNode }[] = [];

  if (tables.length === 0) return suggestions;

  const first = tables[0];

  // 1. Preview data — always
  suggestions.push({
    label: `Show first 10 rows of ${first.name}...`,
    icon: <Search className="w-4 h-4" />,
  });

  // 2. Join two tables — if we have at least 2
  if (tables.length >= 2) {
    const second = tables[1];
    suggestions.push({
      label: `Join ${first.name} and ${second.name}...`,
      icon: <Link2 className="w-4 h-4" />,
    });
  }

  // 3. Indexing advice — if first table has enough columns to need indexes
  if (first.columns.length > 3) {
    suggestions.push({
      label: `What columns in ${first.name} need indexing?`,
      icon: <Lightbulb className="w-4 h-4" />,
    });
  }

  // 4. Tables without primary keys — data quality red flag
  const tablesWithoutPK = tables.filter(
    (t) => !t.columns.some((c) => c.primaryKey),
  );
  if (tablesWithoutPK.length > 0) {
    const names = tablesWithoutPK
      .slice(0, 3)
      .map((t) => t.name)
      .join(", ");
    const suffix = tablesWithoutPK.length > 3 ? ` +${tablesWithoutPK.length - 3} more` : "";
    suggestions.push({
      label: `Tables missing primary keys: ${names}${suffix}`,
      icon: <SearchX className="w-4 h-4" />,
    });
  }

  // 5. Biggest table by column count
  const sortedByCols = [...tables].sort(
    (a, b) => b.columns.length - a.columns.length,
  );
  const widest = sortedByCols[0];
  if (widest && widest.columns.length > 5) {
    suggestions.push({
      label: `Show all columns of ${widest.name} (${widest.columns.length} cols)`,
      icon: <Table2 className="w-4 h-4" />,
    });
  }

  // 6. Largest tables by row estimate
  const withEstimates = tables
    .filter((t) => t.rowEstimate !== null && t.rowEstimate > 0)
    .sort((a, b) => (b.rowEstimate || 0) - (a.rowEstimate || 0));
  if (withEstimates.length >= 2) {
    suggestions.push({
      label: `Which tables have the most rows?`,
      icon: <ArrowUpDown className="w-4 h-4" />,
    });
  }

  // 7. Tables with nullable columns
  const withNullable = tables.filter((t) =>
    t.columns.some((c) => c.nullable),
  );
  if (withNullable.length > 0) {
    suggestions.push({
      label: "Find columns that allow NULL values",
      icon: <Ban className="w-4 h-4" />,
    });
  }

  // 8. Schema inventory — only when there are several tables
  if (tables.length > 3) {
    suggestions.push({
      label: `List all ${tables.length} tables in the schema`,
      icon: <List className="w-4 h-4" />,
    });
  }

  // 9. Relations overview
  if (tables.length >= 2) {
    suggestions.push({
      label: "Show me the foreign key relationships",
      icon: <ListChecks className="w-4 h-4" />,
    });
  }

  // 10. Unique constraints
  const withUnique = tables.filter((t) =>
    t.columns.some((c) => c.unique),
  );
  if (withUnique.length > 0) {
    suggestions.push({
      label: "Find columns with unique constraints",
      icon: <ListChecks className="w-4 h-4" />,
    });
  }

  // 11. Columns with default values — understand auto-populated fields
  const withDefaults = tables.filter((t) =>
    t.columns.some((c) => c.defaultValue),
  );
  if (withDefaults.length > 0) {
    suggestions.push({
      label: "Find columns with default values",
      icon: <FileCheck className="w-4 h-4" />,
    });
  }

  // 12. Audit timestamp detection — created_at / updated_at pattern
  const auditNames = new Set([
    "created_at", "updated_at", "modified_at",
    "created_date", "updated_date", "modified_date",
    "created", "updated", "modified",
  ]);
  const withAudit = tables.filter((t) =>
    t.columns.some((c) => auditNames.has(c.name.toLowerCase())),
  );
  if (withAudit.length > 0) {
    suggestions.push({
      label: "Which tables track created/updated timestamps?",
      icon: <Clock className="w-4 h-4" />,
    });
  }

  // 13. Composite primary keys — tables with multiple PK columns
  const withCompositePK = tables.filter(
    (t) => t.columns.filter((c) => c.primaryKey).length > 1,
  );
  if (withCompositePK.length > 0) {
    const names = withCompositePK.slice(0, 3).map((t) => t.name).join(", ");
    const suffix =
      withCompositePK.length > 3
        ? ` +${withCompositePK.length - 3} more`
        : "";
    suggestions.push({
      label: `Tables with composite primary keys: ${names}${suffix}`,
      icon: <KeyRound className="w-4 h-4" />,
    });
  }

  // 14. Tables with large text / JSON columns
  const largeTypes = new Set(["text", "json", "jsonb", "xml", "bytea"]);
  const withLargeCols = tables.filter((t) =>
    t.columns.some((c) => {
      const base = c.type.toLowerCase().split("(")[0].trim();
      return largeTypes.has(base);
    }),
  );
  if (withLargeCols.length > 0) {
    suggestions.push({
      label: "Find tables with text or JSON columns",
      icon: <FileText className="w-4 h-4" />,
    });
  }

  // 15. Narrowest table — fewest columns
  const sortedAsc = [...tables].sort(
    (a, b) => a.columns.length - b.columns.length,
  );
  const narrowest = sortedAsc[0];
  if (narrowest && narrowest.columns.length <= 3 && tables.length > 2) {
    suggestions.push({
      label: `Show columns of ${narrowest.name} (${narrowest.columns.length} cols)`,
      icon: <Minimize2 className="w-4 h-4" />,
    });
  }

  // 16. Most common data type
  const typeFreq = new Map<string, number>();
  for (const t of tables) {
    for (const c of t.columns) {
      const base = c.type.toLowerCase().split("(")[0].trim();
      typeFreq.set(base, (typeFreq.get(base) || 0) + 1);
    }
  }
  const topType = [...typeFreq.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topType && tables.length > 2) {
    suggestions.push({
      label: `Most common data type: ${topType[0]} (${topType[1]} columns)`,
      icon: <Hash className="w-4 h-4" />,
    });
  }

  return suggestions;
}
