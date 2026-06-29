export type AgentEventType =
  | "reasoning"
  | "tool_call"
  | "tool_result"
  | "tool_error"
  | "retry"
  | "answer"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  content?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  attempt?: number;
  reason?: string;
}

export interface ToolCall {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ExecuteSqlOutput {
  columns: { name: string; type: string }[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
}

export interface CheckSqlOutput {
  safe: boolean;
  checks: { pass: boolean; message: string }[];
}

export const MAX_RETRIES = 5;
export const MAX_ROWS = 1000;
export const QUERY_TIMEOUT_MS = 5000;
export const MAX_SCHEMA_TABLES = 50;
