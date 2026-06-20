import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ParsedSchema } from "./types";

const llm = createOpenAICompatible({
  name: "schemalens",
  apiKey: process.env.LLM_API_KEY || "no-key",
  baseURL: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
});

export interface TableDocs {
  [tableName: string]: string;
}

export async function generateTableDocs(
  schema: ParsedSchema,
): Promise<TableDocs> {
  const model = llm(process.env.LLM_MODEL || "gpt-4o-mini");

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

  const prompt = `You are a database documentation expert. Analyze the following PostgreSQL schema and generate concise, natural-language documentation for each table.

For each table, write 2-4 sentences explaining:
1. What this table represents in business terms
2. How it relates to other tables
3. Any notable columns (status enums, unique identifiers, etc.)

Output format: Return ONLY a JSON object where keys are table names and values are the documentation text as a single string with no markdown or code fences.

Schema:
${tableDescriptions}`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });

  // Parse JSON response
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as TableDocs;
}
