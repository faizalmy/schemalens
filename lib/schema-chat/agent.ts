import { streamText, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateSqlTool, checkSqlTool, executeSqlTool } from "./tools";
import type { AgentEvent, AgentEventType } from "./types";
import { MAX_RETRIES } from "./types";
import { SYSTEM_PROMPT } from "./prompt";
import { buildSchemaContext } from "./context-builder";
import type { ParsedSchema } from "@/lib/types";

const llm = createOpenAICompatible({
  name: "schemalens",
  apiKey: process.env.LLM_API_KEY || "no-key",
  baseURL: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
});

export async function* runSchemaChat(
  query: string,
  schema: ParsedSchema,
  getConnectionString: () => string,
  options?: {
    history?: { role: "user" | "assistant"; content: string }[];
  },
): AsyncGenerator<AgentEvent> {
  const schemaContext = buildSchemaContext(schema);
  const totalSteps = MAX_RETRIES + 2;
  const systemPrompt = SYSTEM_PROMPT
    .replace("{SCHEMA_CONTEXT}", schemaContext)
    .replace("{MAX_STEPS}", String(totalSteps));

  const model = llm(process.env.LLM_MODEL || "gpt-4o-mini");

  const messages = [
    ...(options?.history || []),
    { role: "user" as const, content: query },
  ];

  let reasoningAccumulator = "";
  let retryCount = 0;
  let answerProduced = false;

  // Collect tool results for forced summarization
  const toolResults: { tool: string; output: Record<string, unknown> }[] = [];
  const toolErrors: { tool: string; error: string }[] = [];

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: {
        generate_sql: generateSqlTool,
        check_sql: checkSqlTool,
        execute_sql: executeSqlTool(getConnectionString),
      },
      stopWhen: stepCountIs(MAX_RETRIES + 2),
      maxTokens: 16384,
    });

    // Process the fullStream live as events arrive from the LLM
    for await (const event of result.fullStream) {
      switch (event.type) {
        case "text-delta": {
          reasoningAccumulator += event.text;
          yield {
            type: "reasoning" as AgentEventType,
            content: event.text,
          };
          break;
        }

        case "tool-call": {
          yield {
            type: "tool_call" as AgentEventType,
            tool: event.toolName,
            input: event.input as Record<string, unknown>,
          };
          break;
        }

        case "tool-result": {
          const output = event.output as Record<string, unknown> | undefined;

          // Check if execute_sql returned an error
          if (
            event.toolName === "execute_sql" &&
            output &&
            typeof output === "object" &&
            "error" in output
          ) {
            const errMsg = (output as { error: string }).error;
            retryCount++;

            toolErrors.push({ tool: event.toolName, error: errMsg });

            yield {
              type: "tool_error" as AgentEventType,
              tool: event.toolName,
              error: errMsg,
            };

            yield {
              type: "retry" as AgentEventType,
              attempt: retryCount,
              reason: errMsg,
            };
          } else {
            toolResults.push({
              tool: event.toolName,
              output: (output || {}) as Record<string, unknown>,
            });

            yield {
              type: "tool_result" as AgentEventType,
              tool: event.toolName,
              output: (output || {}) as Record<string, unknown>,
            };
          }
          break;
        }

        case "error": {
          yield {
            type: "error" as AgentEventType,
            content:
              event.error instanceof Error
                ? event.error.message
                : "An error occurred during streaming",
          };
          break;
        }

        case "finish": {
          break;
        }
      }
    }

    // After the fullStream completes, get the complete text
    const fullText = await result.text;
    if (fullText) {
      answerProduced = true;
      yield {
        type: "answer" as AgentEventType,
        content: fullText,
      };
    } else if (reasoningAccumulator) {
      answerProduced = true;
      yield {
        type: "answer" as AgentEventType,
        content: reasoningAccumulator,
      };
    }

    // Force summarize if no answer was produced but we have tool results
    if (!answerProduced && (toolResults.length > 0 || toolErrors.length > 0)) {
      const summary = buildForcedSummary(query, toolResults, toolErrors);
      yield {
        type: "answer" as AgentEventType,
        content: summary,
      };
    }
  } catch (err: unknown) {
    yield {
      type: "error" as AgentEventType,
      content:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * Build a summary from collected tool results when the LLM didn't produce final text.
 */
function buildForcedSummary(
  query: string,
  toolResults: { tool: string; output: Record<string, unknown> }[],
  toolErrors: { tool: string; error: string }[],
): string {
  const lines: string[] = [];
  lines.push(`**Query:** ${query}\n`);

  if (toolErrors.length > 0) {
    lines.push("**Errors encountered:**");
    for (const e of toolErrors) {
      lines.push(`- ${e.error}`);
    }
    lines.push("");
  }

  // Find execute_sql results with actual data
  const dataResults = toolResults.filter(
    (r) => r.tool === "execute_sql" && r.output && "rowCount" in r.output,
  );

  if (dataResults.length > 0) {
    for (const r of dataResults) {
      const rowCount = (r.output as { rowCount?: number }).rowCount ?? 0;
      const columns = (r.output as { columns?: { name: string }[] }).columns ?? [];
      const colNames = columns.map((c) => c.name).join(", ");

      if (rowCount > 0) {
        lines.push(`**Result:** ${rowCount} row(s) returned`);
        if (colNames) lines.push(`Columns: ${colNames}`);
      } else {
        lines.push("**Result:** No rows returned.");
      }
    }
  } else if (toolResults.length > 0) {
    lines.push(`Ran ${toolResults.length} query/queries. See results above.`);
  } else {
    lines.push("No query results were obtained. Please try a different approach.");
  }

  return lines.join("\n");
}
