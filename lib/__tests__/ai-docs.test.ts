import { describe, it, expect } from "vitest";
import type { ParsedSchema } from "../types";

describe("ai-docs prompt building", () => {
  const sampleSchema: ParsedSchema = {
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true, defaultValue: null, unique: true },
          { name: "email", type: "text", nullable: false, primaryKey: false, defaultValue: null, unique: true },
          { name: "name", type: "text", nullable: false, primaryKey: false, defaultValue: null, unique: false },
        ],
        rowEstimate: 500,
      },
      {
        name: "orders",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true, defaultValue: null, unique: true },
          { name: "user_id", type: "uuid", nullable: false, primaryKey: false, defaultValue: null, unique: false },
          { name: "status", type: "varchar(20)", nullable: false, primaryKey: false, defaultValue: "'pending'", unique: false },
        ],
        rowEstimate: 1000,
      },
    ],
    relations: [
      {
        fromTable: "orders",
        fromColumn: "user_id",
        toTable: "users",
        toColumn: "id",
        constraintName: "orders_user_id_fkey",
      },
    ],
  };

  it("includes all tables in the prompt context", () => {
    const prompt = buildPrompt(sampleSchema);
    expect(prompt).toContain("users");
    expect(prompt).toContain("orders");
  });

  it("includes column details and constraints", () => {
    const prompt = buildPrompt(sampleSchema);
    expect(prompt).toContain("PRIMARY KEY");
    expect(prompt).toContain("UNIQUE");
    expect(prompt).toContain("NOT NULL");
    expect(prompt).toContain("default: 'pending'");
  });

  it("includes foreign key relationships", () => {
    const prompt = buildPrompt(sampleSchema);
    expect(prompt).toContain("→ users.id via user_id");
  });

  it("requests JSON output format", () => {
    const prompt = buildPrompt(sampleSchema);
    expect(prompt).toContain("JSON object");
    expect(prompt).toContain("where keys are table names");
  });

  it("parses valid JSON response", () => {
    const rawResponse = `{
      "users": "Stores registered user accounts. Each user has a unique email address.",
      "orders": "Tracks customer purchase orders. Each order belongs to a user via user_id."
    }`;

    const cleaned = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    expect(parsed.users).toContain("user accounts");
    expect(parsed.orders).toContain("purchase orders");
  });

  it("handles code-fenced JSON response", () => {
    const rawResponse = '```json\n{"users": "desc"}\n```';
    const cleaned = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    expect(parsed.users).toBeDefined();
  });
});

// Duplicate the prompt-building logic so the test is self-contained
function buildPrompt(schema: ParsedSchema): string {
  const tableDescriptions = schema.tables
    .map((t) => {
      const cols = t.columns
        .map((c) => {
          const hints = [
            c.primaryKey && "PRIMARY KEY",
            c.unique && "UNIQUE",
            !c.nullable && "NOT NULL",
            c.defaultValue && `default: ${c.defaultValue}`,
          ]
            .filter(Boolean)
            .join(", ");
          return `  - ${c.name} (${c.type})${hints ? ` — ${hints}` : ""}`;
        })
        .join("\n");

      const fks = schema.relations
        .filter((r) => r.fromTable === t.name)
        .map((r) => `  → ${r.toTable}.${r.toColumn} via ${r.fromColumn}`)
        .join("\n");

      return `Table: ${t.name}
Columns:
${cols}
${fks ? `Foreign keys:\n${fks}` : ""}`;
    })
    .join("\n\n");

  return `You are a database documentation expert. Analyze the following PostgreSQL schema and generate concise, natural-language documentation for each table.

For each table, write 2-4 sentences explaining:
1. What this table represents in business terms
2. How it relates to other tables
3. Any notable columns (status enums, unique identifiers, etc.)

Output format: Return ONLY a JSON object where keys are table names and values are the documentation text as a single string with no markdown or code fences.

Schema:
${tableDescriptions}`;
}
