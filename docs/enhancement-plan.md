---
tags: [hackathon, plan, schemalens, h0, features, enhancements]
created: 2026-06-21
status: draft
version: 1.0
deadline: 2026-06-29
related:
  - "[[PRD]]"
  - "[[architecture]]"
  - "[[decisions]]"
---

# SchemaLens — Enhancement Plan (Pre-Submission)

> **Context:** SchemaLens already covers all mandatory H0 hackathon requirements (Aurora PostgreSQL, Vercel deploy, full-stack app). These enhancements target the **judging criteria** — specifically **Originality** and **Impact & Real-world Applicability** — to maximise win probability.

---

## Strategic Priority Matrix

| Feature | Originality | Impact | Tech Impl | Design | Effort | Priority |
|---|---|---|---|---|---|---|
| **F1: Schema Health Score** | ★★★★ | ★★★★★ | ★★★ | ★★★ | 2 days | **P0** |
| **F2: AI Schema Chat** | ★★★★★ | ★★★★ | ★★★★ | ★★★ | 3 days | **P0** |
| **F3: GitHub Action + Badge** | ★★★ | ★★★★★ | ★★★★ | ★★ | 2 days | **P1** |
| **F4: Schema Version Timeline** | ★★★★ | ★★★★ | ★★★★ | ★★★ | 2.5 days | **P1** |
| **F5: Build Script Suggestion** | ★★★★ | ★★★★ | ★★★★ | ★★ | 1.5 days | **P1** |

**Scoring:** Each criteria maps to the H0 judging rubric (25% each). Effort includes testing.

---

## F1: Schema Health Score

**Goal:** Score any introspected database 0-100 with actionable recommendations.

**Judging impact:** High. Judges see an instant "grade" as the first thing on any connected DB. Numerical scores are demo-friendly and demonstrate real craftsmanship.

### What to build

Analyse the introspection data against 10 checks:

| # | Check | Weight | Example finding |
|---|---|---|---|
| 1 | Every table has a primary key | 15 pts | `logs` table has no PK |
| 2 | FK constraints exist where expected | 15 pts | `order_items.order_id` references nothing |
| 3 | Naming convention consistency | 10 pts | Mixed `snake_case` and `camelCase` |
| 4 | Appropriate column types | 10 pts | `price` is VARCHAR not NUMERIC |
| 5 | NOT NULL on required columns | 10 pts | `users.email` allows NULL |
| 6 | Created-at / updated-at conventions | 10 pts | Only half the tables have timestamps |
| 7 | No oversized columns | 10 pts | `VARCHAR(500)` on a zip code column |
| 8 | Unique constraints on natural keys | 10 pts | `email` column has no unique constraint |
| 9 | Boolean column naming convention | 5 pts | Mix of `is_active` and `active_flag` |
| 10 | Reasonable column count per table | 5 pts | Table with 60+ columns |

### Implementation

```
lib/schema-health.ts        — scoring engine (pure functions, easily testable)
components/erd/health-panel.tsx  — score widget + recommendation list
components/erd/health-gauge.tsx  — animated SVG gauge component
```

**Key API:**
```typescript
interface HealthResult {
  score: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: HealthCheckResult[];
}

function assessSchemaHealth(tables: Table[], relations: Relation[]): HealthResult
```

Each `HealthCheckResult` includes: `passed: boolean`, `message: string`, `severity: 'error' | 'warning' | 'info'`, `tableName?: string`, `suggestion?: string`.

### UI

- Animated radial gauge in the ERD sidebar (same panel as AI Docs / Data Preview)
- Expandable recommendations list, grouped by severity (errors first, then warnings, then info)
- Each recommendation is clickable — clicking scrolls the ERD canvas to the relevant table

### Data flow

```
introspectDatabase()
  → tables, relations
  → assessSchemaHealth(tables, relations)
    → [{passed, message, severity, suggestion}, ...]
    → score = sum of passed check weights
  → render health gauge + recommendation list
```

### Tests

```
tests/lib/schema-health.test.ts
  - empty database → score 100 (no violations)
  - table without PK → weight penalty
  - consistent snake_case → no penalty
  - mixed conventions → penalty applied
  - VARCHAR price column → type warning
  - 60+ column table → wide-table warning
```

### Risks

- False positives on intentionally denormalised schemas → keep checks as "suggestions" not "errors"
- Performance on 200+ table databases → all checks are O(n) single-pass, fine

---

## F2: AI Schema Chat (Agent Mode)

**Goal:** An agentic chat interface where users naturally ask questions, get SQL queries generated, see them executed, and receive the real results — with full visibility into the agent's reasoning, tool calls, and error recovery loop.

**Judging impact:** Highest "wow" factor. This is the feature that will be the centrepiece of the demo video. A chat that *writes, runs, and fixes SQL live* in front of the judge is memorable hardware-store-quality demo material. Shows full-stack, production-ready thinking.

---

### Architecture overview

```
User: "Show me all users who placed orders in the last 30 days"

  ┌─ Agent Reasoning Loop ──────────────────────────────────┐
  │                                                          │
  │  1. Think: User wants users + orders join with date      │
  │     filter                                                │
  │  2. Tool: generate_sql(context="...") → SQL query        │
  │  3. Tool: check_sql(query, schema) → validation report    │
  │  4. Tool: execute_sql(query, conn_string) → result/error │
  │  5. Think: Analyse result — does it answer the question? │
  │  6. If error: Think → fix → retry execute_sql            │
  │  7. Think: Format result for human                        │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  AI: "[Reasoning] To find recent orders, I'll join...
       [Tool: generate_sql] SELECT u.* FROM users u...
       [Tool: execute_sql] ✓ 42 rows returned
       [Answer] Here are the 42 users who placed orders..."
```

---

### What makes this special

| Capability | How it works |
|---|---|
| **SQL generation** | AI writes PostgreSQL queries based on the actual schema (table names, column types, FK relationships) |
| **SQL output mode** | If user asks "write me a query that..." or "give me the SQL for...", agent returns the SQL code in a formatted code block and **skips execution** — no need to run it |
| **Full-execution mode** | If user asks "show me..." or "find users who...", agent generates SQL, validates, executes, and returns real results |
| **Self-healing** | Generated SQL is executed against the real database. If it errors (bad column, syntax issue), the error is fed back to the AI which fixes and retries — up to 3 attempts |
| **Validation layer** | Before execution, SQL is checked for safety: read-only check (blocks INSERT/UPDATE/DELETE/DROP), timeout guard (5s max), row limit (1000 max) |
| **Reasoning visibility** | Every step the AI takes is displayed as a collapsible card in the chat — "Thinking...", "Generating SQL...", "Executing query... ✓ 42 rows", "Formatting response..." |
| **Tool call UI** | Tool invocations render as distinct UI blocks, not raw text. Think Claude's tool-use bubble pattern. |
| **Result rendering** | Tabular results render as an inline scrollable table. Single values render inline. |

### User question types it handles

| Category | Examples | Agent behaviour |
|---|---|---|
| **Schema questions** | "Which tables reference users?" / "Show me all nullable columns" / "Which tables have no indexes?" | Generates SQL → may execute (schema queries are cheap) → explains |
| **Data questions** | "Show users who haven't logged in this month" / "What's the average order value?" / "Top 10 customers by revenue" | Generates SQL → validates → executes → shows results table |
| **SQL-only questions** | "Write me a query to find duplicate emails" / "Give me SQL for month-over-month growth" / "Can you write a CTE for this?" | Generates SQL → **shows code block only** → no execution needed |
| **Explain-my-SQL** | Paste a SQL query: "What does this query do?" / "Can you optimise this?" | Analyses provided SQL → explains in plain language → may suggest improvements |
| **Complex queries** | "Which products are frequently bought together?" / "Month-over-month growth rate for new signups" | Generates SQL → validates → executes → shows results + explanation |
| **Insight + explanation** | "Is there a data quality issue?" / "Why might this query be slow?" | May execute relevant queries → interprets results → explains |
| **Export / share** | "Generate a CSV of inactive users" / "Show me the raw DDL for the orders table" | Generates SQL → executes → returns formatted output |

---

### Implementation

#### Files to create

```
lib/schema-chat/
  agent.ts              — agent orchestration loop (think → tool → observe → repeat)
  tools.ts              — tool definitions: generate_sql, check_sql, execute_sql
  context-builder.ts    — build schema context + conversation history
  types.ts              — ChatMessage, ToolCall, AgentStep types
  prompt.ts             — system prompt for the agent

app/api/schema-chat/route.ts  — streaming agent endpoint

components/erd/
  schema-chat-panel.tsx       — main chat UI container
  chat-message.tsx            — single message bubble (user or AI)
  chat-tool-call.tsx          — tool invocation card (expandable)
  chat-reasoning-block.tsx    — "Thinking..." animated step indicator
  chat-result-table.tsx       — inline scrollable SQL result table
  chat-suggested-questions.tsx — chip bar: click pre-fills input (doesn't send), dynamic per schema, max 7 chips
  chat-input.tsx              — text input + send button
```

#### Key API design

```typescript
// POST /api/schema-chat
{
  schemaId: string,
  message: string,
  history?: { role: 'user' | 'assistant' | 'tool', content: string, toolCalls?: ToolCall[] }[]
}

// Response — server-sent events stream
event: step
data: { type: 'reasoning', content: "To find recent orders, I need to..." }

event: step
data: { type: 'tool_call', tool: 'generate_sql', input: { question: "..." }, output: "SELECT ..." }

event: step
data: { type: 'tool_call', tool: 'check_sql', input: { query: "SELECT ..." }, output: { safe: true } }

event: step
data: { type: 'tool_call', tool: 'execute_sql', input: { query: "SELECT ..." }, output: { rows: 42, columns: [...] } }

event: step
data: { type: 'tool_error', tool: 'execute_sql', error: "column 'emial' does not exist" }

event: step
data: { type: 'retry', attempt: 2, reason: "Column name typo — retrying with 'email'" }

event: step
data: { type: 'answer', content: "Here are 42 users who placed orders..." }
```

#### Agent loop (lib/schema-chat/agent.ts)

```typescript
class SchemaChatAgent {
  private schema: Schema;
  private db: ConnectionPool;
  private ai: AIProvider;

  async *run(messages: ChatMessage[]): AsyncGenerator<AgentStep> {
    let attempts = 0;

    while (true) {
      // 1. Think: generate next action with schema context + history
      yield { type: 'reasoning', content: '...' };
      const action = await this.think(messages);

      if (action.type === 'answer') {
        yield { type: 'answer', content: action.content };
        return;
      }

      // 2. Execute tool
      if (action.type === 'tool_call') {
        yield { type: 'tool_call', tool: action.tool, input: action.input };
        const result = await this.executeTool(action);

        if (result.error && attempts < 3) {
          // 3. Error recovery: feed back to agent
          attempts++;
          yield { type: 'tool_error', tool: action.tool, error: result.error };
          yield { type: 'retry', attempt: attempts, reason: '...' };
          messages.push({ role: 'tool', content: `Error: ${result.error}` });
          continue; // loop back to think
        }

        yield { type: 'tool_result', tool: action.tool, output: result };
        messages.push({ role: 'tool', content: JSON.stringify(result) });
      }
    }
  }
}
```

#### Tools (lib/schema-chat/tools.ts)

```typescript
const tools = {
  generate_sql: {
    description: "Generate a PostgreSQL query from a natural language request, given the full schema context",
    parameters: {
      question: "What the user wants to query",
      schema: "The database schema (tables, columns, types, FKs)"
    },
    execute: async ({ question, schema }) => {
      // Prompt the AI to write SQL using schema context
      const sql = await ai.chat(`Given this schema:\n${JSON.stringify(schema)}\n\nWrite SQL for: ${question}\n\nReturn ONLY the SQL query, no explanation.`);
      return { query: sql.trim() };
    }
  },

  check_sql: {
    description: "Validate a SQL query is safe and syntactically valid",
    parameters: {
      query: "The SQL query to validate"
    },
    execute: async ({ query }) => {
      const safetyChecks = [
        { check: () => !/\\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\\b/i.test(query), message: "Query must be read-only" },
        { check: () => query.length < 5000, message: "Query too long" },
      ];
      const results = safetyChecks.map(s => ({ pass: s.check(), message: s.message }));
      return { safe: results.every(r => r.pass), checks: results };
    }
  },

  execute_sql: {
    description: "Execute a SQL query against the user's database and return results",
    parameters: {
      query: "The validated SQL query to execute",
      maxRows: 1000,
      timeoutMs: 5000
    },
    execute: async ({ query, maxRows, timeoutMs }) => {
      const pool = getPool(decrypt(connectionString));
      const result = await pool.query({ text: query, rowMode: 'array' });
      return {
        columns: result.fields.map(f => ({ name: f.name, type: f.dataTypeID })),
        rows: result.rows.slice(0, maxRows),
        rowCount: result.rows.length,
        truncated: result.rows.length > maxRows
      };
    }
  }
};
```

#### System prompt (lib/schema-chat/prompt.ts)

```
You are SchemaBot — an AI database assistant integrated into SchemaLens.
You have access to the user's PostgreSQL schema and can write and execute
SQL queries against their database.

## Capabilities
- Answer questions about the schema structure
- Write SQL queries to answer data questions
- Execute queries and return real results
- Fix and retry failed queries automatically
- Explain query results in plain language
- Suggest query optimizations when relevant

## Rules
1. Always think before acting — reason step by step
2. Use generate_sql tool to write queries
3. Use check_sql tool to validate before executing
4. Use execute_sql to run queries against the database
5. If execute_sql returns an error, analyse it, fix the query, and retry
6. Never generate destructive SQL (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE)
7. Limit results to 1000 rows max
8. Always explain what the query does before showing results
9. If a question can't be answered with the available schema, say so

## Current Schema

{SCHEMA_CONTEXT}
```

---

### UI / UX design

The chat panel lives in the right sidebar alongside "AI Docs", "Data Preview", and the new "Health Score" tab.

#### Layout

```
┌─────────────────────────────────────────┐
│ 🤖 Schema Chat                    [−][×] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 💭 Thinking...                     ││
│  │  "To find recent orders, I need    ││
│  │   to join the orders and users     ││
│  │   tables on user_id..."            ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔧 generate_sql(query)        ▼    ││
│  │ SELECT u.*, o.total                 ││
│  │ FROM users u                        ││
│  │ JOIN orders o ON o.user_id = u.id...││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔧 check_sql(query)           ✓    ││
│  │ Safe to execute                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔧 execute_sql(query)         ✓    ││
│  │ 42 rows returned                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📊 Results                          ││
│  │ ┌─────┬────────┬────────┐          ││
│  │ │ id  │ email  │ total  │          ││
│  │ ├─────┼────────┼────────┤          ││
│  │ │ 1   │ a@...  │ 149.99 │          ││
│  │ │ 2   │ b@...  │ 89.50  │          ││
│  │ │ ... │        │        │          ││
│  │ └─────┴────────┴────────┘          ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Here are 42 users who placed        ││
│  │ orders in the last 30 days. The     ││
│  │ average order value is $124.32...   ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌───── Suggested questions ───────────┐│
│  │ "Show inactive users"  "Avg orders" ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────┐    │
│  │ Ask me anything about your DB...│ ⏎ │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### Key UI behaviours

| Element | Behaviour |
|---|---|
| **Reasoning block** | Collapsed by default. Shows first line. Click to expand full reasoning. Animated dots while "thinking". |
| **Tool call card** | Shows tool name + icon + status (running → ✓ success / ✗ error). Click to expand/collapse details (input JSON, output). |
| **Error card** | Red border. Shows error message + "Retrying (2/3)..." indicator. Animated pulsing retry icon. |
| **Result table** | Scrollable (horizontal + vertical). Column headers with type badges. Row count footer. Copy-as-CSV button. |
| **Answer block** | Clean markdown rendering. Streaming text (typewriter effect). |
| **Suggested questions** | Chip bar below input. **Click pre-fills the input** (trailing `...`), doesn't send automatically. User reviews, edits, then presses Enter. Dynamic per schema. |
| **Input** | Full-width, multi-line (Shift+Enter for newline, Enter to send). Send button disabled while streaming. |

#### Mobile-friendly considerations

- Tool call cards collapse aggressively on narrow viewports
- Result table switches to card layout (one row per card) on screens < 480px
- Input stays fixed at bottom on mobile

---

### Suggested questions chip bar — detailed design

```
┌──────────────────────────────────────────────────┐
│  Suggestions based on your schema:               │
│                                                  │
│  ┌─────────────────────────┐  ┌────────────────┐ │
│  │ ✏️ Write me a query     │  │ 📋 Show all    │ │
│  │   that finds...         │  │   tables...    │ │
│  └─────────────────────────┘  └────────────────┘ │
│  ┌─────────────────────────┐  ┌────────────────┐ │
│  │ 🤔 Explain the         │  │ 💡 What columns │ │
│  │   relationship...       │  │   need...      │ │
│  └─────────────────────────┘  └────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Write me a query that finds...           │ ⏎ │
│  │ (cursor here — user continues typing)    │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

#### Behaviour

| Action | What happens |
|---|---|
| **Click chip** | Inserts suggestion text (with trailing `...`) into the input field. Sets cursor at end. Does NOT send. |
| **Chip already in input** | If input text starts with the chip text, selects all for easy replacement. |
| **Type in input** | Chips still visible (below input). First keystroke doesn't dismiss. |
| **Send** | Press Enter — chips stay visible for follow-up. |
| **New schema loaded** | Chips regenerate based on detected table names. |

#### Chip templates

```typescript
const SUGGESTIONS = {
  always: [
    { label: "Write me a query that finds...",       icon: "✏️" },
    { label: "Show all tables without...",           icon: "📋" },
    { label: "Explain the relationship between...",  icon: "🤔" },
    { label: "Summarise the entire schema for me",   icon: "📄" },
  ],
  // Dynamically generated when tables are detected:
  schemaSpecific: (tables: string[], columns: Record<string, string[]>) => [
    tables[0] && {
      label: `Show first 10 rows of ${tables[0]}...`,
      icon: "🔍"
    },
    tables[0] && tables[1] && {
      label: `Write a query joining ${tables[0]} and ${tables[1]}...`,
      icon: "🔗"
    },
    columns[tables[0]]?.length > 3 && {
      label: `What columns in ${tables[0]} need indexing?`,
      icon: "💡"
    },
  ].filter(Boolean),
};

// Max 7 chips total: 4 always-on + up to 3 schema-specific
// Renders as 2 rows of ~3-4 chips each, wrapping naturally
```

#### Empty state (no schema connected yet)

If user hasn't connected a database, show generic SQL-writing suggestions only:

```
┌─────────────────────────────────────────────┐
│ 💬 I can write and run SQL for you. Try:    │
│                                             │
│  ✏️ Write me a query that...                │
│  📄 Help me understand this schema...       │
└─────────────────────────────────────────────┘
```

---

### Error recovery scenarios

| Scenario | Agent behaviour | User sees |
|---|---|---|
| **SQL typo** (wrong column name) | Detects PG error, identifies likely fix, regenerates SQL | "Retrying (2/3) — column 'emial' not found, did you mean 'email'?" |
| **Table doesn't exist** (user renamed it) | Scans schema context for similar table names, retries | "Table 'usr' not found. Trying 'users' instead..." |
| **Syntax error** | Back to generate_sql with original question + error context | "SQL syntax error — regenerating..." |
| **Timeout (>5s)** | Returns partial results or simplifies query | "Query was taking too long — showing first 100 rows only" |
| **Too many rows** (10K+) | Auto-appends LIMIT 1000 | "Showing 1,000 of 12,345 rows" |
| **Safety check fail** | Prevents execution, explains why | "I can't run INSERT queries — I'm limited to read-only SELECT" |
| **All retries exhausted** | Returns the error + the working parts | "I couldn't fix this after 3 attempts. Here's what I know: the error suggests..." |

---

### Reuse existing infrastructure

| Existing piece | What it provides |
|---|---|
| `lib/ai-docs.ts` | AI provider config (OpenAI-compatible endpoint) |
| `app/api/generate-docs/route.ts` | Pattern for streaming API routes with AI SDK |
| `@ai-sdk/react` (already in deps) | `useChat` / streaming hooks |
| `lib/encryption.ts` | AES-256-GCM decrypt for connection strings |
| `lib/introspection.ts` | Schema data model (tables, columns, relations) |
| `lib/schema-store.ts` | Encrypted connection string storage |
| `lib/db/schema.ts` | Drizzle table definitions for app's own data |

---

### Testing

```
tests/lib/schema-chat/agent.test.ts
  - agent produces an answer for valid questions
  - agent retries on SQL error (mock PG error)
  - agent exhausts retries gracefully
  - agent refuses destructive SQL

tests/lib/schema-chat/tools.test.ts
  - check_sql blocks INSERT/UPDATE/DELETE/DROP
  - check_sql allows SELECT
  - execute_sql returns column metadata + rows
  - execute_sql respects maxRows limit
  - execute_sql respects timeoutMs

tests/components/schema-chat-panel.test.tsx
  - renders empty state with suggested questions
  - streams agent steps into chat bubbles
  - tool call cards collapse/expand
  - error state renders red card + retry badge
  - result table scrolls on overflow
  - suggested questions regenerate per schema
```

---

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| LLM API latency on multi-turn loops | Each turn is independent; reasoning streaming means user sees progress immediately |
| Schema context too large for prompt | Truncate to FK-linked tables first, then by column count; cap at 50 tables |
| Long-running queries block other users | Per-query timeout (5s), per-schema concurrency limit (1), separate pool from app DB |
| Connection pool exhaustion | Use a separate pool for chat queries (max 2 connections) disconnected after idle 30s |
| User asks 100 questions in a row | Per-user rate limit: 20 queries / 5 min; suggest waiting between queries |
| Bad SQL that crashes PG | All queries run in a read-only transaction; `SET statement_timeout = '5s'` per session |

#### F2.7 Conversation persistence

Conversations are stored in the app's own Aurora PostgreSQL via two Drizzle tables:

**Tables:** `chat_conversations` (id, userId, schemaId, title, timestamps) + `chat_messages` (id, conversationId, role, content, toolCalls jsonb, reasoning, resultTable jsonb, createdAt).

**Behaviour:**

| Action | What happens |
|--------|-------------|
| **First message sent** | Auto-creates a `chat_conversation` row linked to schema and user |
| **Each response completes** | Auto-saves all messages via `PATCH /api/schema-chat/conversations/[id]` |
| **Title** | Derived from the first user message (truncated to 60 chars) |
| **"+" button (header)** | Creates a new conversation, clears current messages |
| **History icon (header)** | Opens a dropdown listing past conversations (50 most recent, sorted by updatedAt) |
| **Click a history item** | Loads that conversation's messages into the chat panel |
| **Trash icon (hover)** | Deletes the conversation and all its messages (cascade) |

**API routes:**

```
GET    /api/schema-chat/conversations?schemaId=xxx   — list conversations
POST   /api/schema-chat/conversations                 — create new conversation
GET    /api/schema-chat/conversations/[id]            — load conversation + messages
PATCH  /api/schema-chat/conversations/[id]            — save messages + update title
DELETE /api/schema-chat/conversations/[id]            — delete conversation (cascade)
```

---

## F3: GitHub Action + Badge

**Goal:** Let users integrate SchemaLens into their CI/CD pipeline. Connect once, get auto-generated schema docs on every push, viewable via a badge in their README.

**Judging impact:** Directly proves "shippable software" — one of the three reasons the judges cite for joining the hackathon. Enterprise-ready integration.

### What to build

Two components:

#### 3a. Schema badge endpoint

```
GET /api/badge/{schemaId}
  → Returns an SVG badge: [Schema Docs](https://img.shields.io/badge/--)
  → Redirects to the share page when clicked
```

Store schema badge data in the existing `saved_schemas` table (add a `badgeEnabled` boolean column).

#### 3b. Schema sync API (for CI)

```
POST /api/sync-schema
  Auth: Bearer <API key>
  Body: { connectionString, name? }

  1. Connect to the database
  2. Introspect schema
  3. Update stored data
  4. Return { schemaId, shareUrl, badgeUrl }
```

This is essentially the existing `/api/query` path but as a push endpoint for CI.

### Implementation

```
lib/badge.ts           — SVG badge renderer
app/api/badge/[id]/route.ts  — badge endpoint (ISR, public, no auth)
app/api/sync-schema/route.ts — CI sync endpoint (API key auth)
components/settings-tab.tsx  — enable badge in dashboard
```

### Data flow (CI mode)

```
Git push → GitHub Action
  → POST schemalens.app/api/sync-schema (with connection string)
  → SchemaLens introspects, updates stored data
  → Returns share URL + badge URL
  → GitHub Action posts PR comment with badge:
    [![Schema Docs](https://schemalens.app/api/badge/xxx)](https://schemalens.app/share/xxx)
```

### Risks

- API key management → use the existing better-auth user session; generate a scoped API token
- Introspection on very large databases in CI → timeout after 30s, return partial results

---

## F4: Schema Version Timeline

**Goal:** Track schema changes over time. Each time a user connects (or syncs via CI), snapshot the current schema and let them compare versions.

**Judging impact:** Shows enterprise thinking. AWS judges will immediately see value for audit compliance and schema governance — common in regulated industries.

### Implementation

Extend the `saved_schemas` table (or create separate table):

```
saved_schema_versions
  id: UUID PK
  schema_id: UUID FK → saved_schemas.id
  snapshot: JSONB (full tables + relations snapshot)
  created_at: TIMESTAMP
  diff_summary: TEXT (auto-generated: "2 tables added, 3 columns changed")
```

### Data flow

```
On every connect (or CI sync):
  1. Introspect database
  2. Compare with latest snapshot
  3. Generate diff summary
  4. Only save if changed
```

### Diff engine

```
lib/schema-diff.ts

function diffSchemas(oldSchema, newSchema): SchemaDiff
  → { addedTables, removedTables, changedTables, addedColumns, ... }
```

Each diff entry includes: what changed, old vs new, semantic impact ("Non-nullable column added — existing records will need defaults").

### UI

- Timeline tab in dashboard: "v1 (Jun 20) · v2 (Jun 22) · v3 (Jun 23)"
- Click a version to load that ERD
- Version comparison view: highlight changed tables in yellow, new tables in green, removed in red

### Risks

- Storage growth on frequent CI syncs → cap at 50 versions per schema, prune oldest
- JSONB diff can be expensive → compute diff in JS (lib/schema-diff.ts), store only the result

---

## F5: Build Script Suggestion

**Goal:** After introspection, analyse the schema and suggest a `docker-compose.yml`, `.env.example`, or `schema.sql` bootstrap file tailored to the project.

**Judging impact:** Novelty + practical utility. "Not just a viewer — it tells you how to build on top of this." Helpful for the demo: connect a DB and instantly get usable output.

### Implementation

```
lib/schema-suggest.ts

function suggestDockerCompose(tables): string
  // Generate a docker-compose.yml with Postgres service
  // that matches the schema's detected setup

function suggestEnvExample(tables): string
  // Generate .env.example based on detected connection params

function suggestMigration(tables): string
  // Generate a skeleton Drizzle/Knex migration
  // with CREATE TABLE statements from the schema
```

### UI

- Tab in export panel alongside "Download DDL" and "Download Markdown"
- Each suggestion rendered in a code block with copy button
- "Download as file" option for each

### Risks

- Suggestion quality varies by schema complexity → show as "starter template" with disclaimer
- Blindly generating migrations for existing schemas could be misleading → prefix with `-- Generated by SchemaLens — review before applying`

---

## Submission Checklist

| Deliverable | Status | Owner |
|---|---|---|
| F1: Schema Health Score | ❌ Not started | — |
| F2: AI Schema Chat | ✅ Done — agent, tools, UI, streaming, markdown, hard block, conversation persistence | Self |
| F3: GitHub Action + Badge | ❌ Not started | — |
| F4: Schema Version Timeline | ❌ Not started | — |
| F5: Build Script Suggestion | ❌ Not started | — |
| 3-min demo video | ❌ Not started | — |
| Architecture diagram | ❌ Not started | — |
| AWS Database usage screenshot | ❌ Not started | — |
| Optional: blog post | ❌ Not started | — |

---

## Build Order (Recommended)

### Sprint 1 (Days 1-2: Jun 22-23) — Foundation

| Day | Task | Output |
|---|---|---|
| 1 | F1: Schema Health Score engine + tests | `lib/schema-health.ts` + tests pass |
| 2 | F1: Health gauge UI + recommendation panel | Health score visible on any connected DB |

### Sprint 2 (Days 3-5: Jun 24-26) — Wow features

| Day | Task | Output |
|---|---|---|
| 3 | F2: Agent loop + tools (agent.ts, tools.ts, types.ts) | Agent can think, call generate_sql, execute_sql, retry on error |
| 4 | F2: Chat API + streaming SSE endpoint | Streaming agent loop works end-to-end via API |
| 5 | F2: Chat panel UI + tool call cards + result table | Full chat UI in ERD sidebar with reasoning visibility |

### Sprint 3 (Days 6-8: Jun 27-29) — Polish + Submission

| Day | Task | Output |
|---|---|---|
| 6 | F5: Build Script Suggestion + F2 polish | Export templates + final chat polish (suggested Qs, mobile) |
| 7 | F3: Badge endpoint + sync API | Schema badge renders, CI endpoint works |
| 8 | Record demo video (lead with Agent Chat), take AWS screenshot, arch diagram | Submission ready |

---

## How each feature maps to judging criteria

| Feature | Technological Implementation | Design | Impact & Applicability | Originality |
|---|---|---|---|---|
| **F1: Health Score** | Rules engine over introspection data | Radial gauge + recommendations | "How healthy is my database?" — universal need | Automated schema review is novel for a web tool |
| **F2: AI Chat (Agent Mode)** | Agent loop with 3 tools, SQL generation + execution, self-healing | Reasoning blocks, tool call cards, scrollable result table | Talk to your database in plain English — generates and runs SQL live | Chat-to-SQL-agent with self-healing loop is genuinely novel |
| **F3: GitHub Action + Badge** | CI/CD integration, API token auth | Badge SVG renders in READMEs | "Shippable software" — judges' explicit criteria | Schema docs as a CI artifact is a new category |
| **F4: Version Timeline** | Diff engine, snapshot management | Timeline + diff-highlighted ERD | Schema governance for production teams | Schema versioning in a web tool is rare |
| **F5: Build Script Suggestion** | Template generation from schema | Downloadable code snippets | Practical, actionable output | "Read my schema, write my config" is fresh |

---

## Effort Summary

| Feature | Backend | Frontend | Tests | Total |
|---|---|---|---|---|
| F1: Health Score | 4h | 6h | 2h | ~12h |
| F2: AI Chat (Agent Mode) | 8h | 10h | 4h | ~22h |
| F3: GitHub Action | 6h | 4h | 2h | ~12h |
| F4: Schema Version Timeline | 6h | 6h | 2h | ~14h |
| F5: Build Script Sugg. | 3h | 4h | 1h | ~8h |
| **Total** | **27h** | **30h** | **11h** | **~68h** |
