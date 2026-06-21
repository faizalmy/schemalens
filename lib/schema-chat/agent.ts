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
  const systemPrompt = SYSTEM_PROMPT.replace("{SCHEMA_CONTEXT}", schemaContext);

  const model = llm(process.env.LLM_MODEL || "gpt-4o-mini");

  const messages = [
    ...(options?.history || []),
    { role: "user" as const, content: query },
  ];

  let reasoningAccumulator = "";
  let retryCount = 0;

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
    });

    // Process the fullStream live as events arrive from the LLM
    for await (const event of result.fullStream) {
      switch (event.type) {
        case "text-delta": {
          // Stream reasoning text character-by-character
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
          // Stream complete — the full text across all steps is our answer
          // Note: reasoning was already streamed as text-delta events above
          break;
        }
      }
    }

    // After the fullStream completes, get the complete text
    // The SDK accumulates text across all steps into result.text
    const fullText = await result.text;
    if (fullText) {
      yield {
        type: "answer" as AgentEventType,
        content: fullText,
      };
    } else if (reasoningAccumulator) {
      // If no separate answer text, use accumulated reasoning as answer
      yield {
        type: "answer" as AgentEventType,
        content: reasoningAccumulator,
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
