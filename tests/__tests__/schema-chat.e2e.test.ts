/**
 * E2E tests for AI Schema Chat — full user flow.
 * Requires dev server running on localhost:3000.
 *
 * Run: npm run dev (in another terminal) && npx vitest run tests/__tests__/schema-chat.e2e.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";
const API = `${BASE}/api`;
const ORIGIN = { Origin: BASE };
const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://schemalens:schemalens_dev@localhost:5434/schemalens_test";

let sessionCookie: string;
let schemaId: string;
let convId: string;

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

function parseCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

describe("Schema Chat E2E", () => {
  beforeAll(async () => {
    // Sign up a fresh user
    const email = `chat-e2e-${rand()}@test.dev`;
    const res = await fetch(`${API}/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({ email, password: "testpass123", name: "Chat E2E" }),
    });
    expect(res.status).toBe(200);
    sessionCookie = parseCookie(res.headers.get("set-cookie"));
    expect(sessionCookie).toBeTruthy();

    // Create a schema via introspect
    const schemaRes = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ connectionString: TEST_DB, name: `Chat E2E Schema ${rand()}` }),
    });
    expect(schemaRes.status).toBe(200);
    const schema = await schemaRes.json();
    schemaId = schema.schemaId;
    expect(schemaId).toBeTruthy();
  });

  it("creates a conversation for the schema", async () => {
    const res = await fetch(`${API}/schema-chat/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ schemaId, title: "Schema Chat E2E" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    convId = data.id;
  });

  it("lists the conversation from history", async () => {
    const res = await fetch(`${API}/schema-chat/conversations?schemaId=${schemaId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.some((c: any) => c.id === convId)).toBe(true);
  });

  it("saves messages to the conversation", async () => {
    const messages = [
      { role: "user", content: "What tables do I have?" },
      {
        role: "assistant",
        content: "You have **users** and **orders** tables.",
        reasoning: "The user wants to know their tables. Let me check the schema context.",
        toolCalls: [
          {
            id: "gen1",
            tool: "generate_sql",
            input: { query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", explanation: "List all tables" },
          },
        ],
      },
      { role: "user", content: "Show me the users table columns" },
      {
        role: "assistant",
        content: "The **users** table has these columns:\n- `id` (integer, PK)\n- `email` (text)\n- `name` (text)\n- `created_at` (timestamp)",
        toolCalls: [
          {
            id: "sql1",
            tool: "generate_sql",
            input: { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'" },
          },
        ],
        resultTable: {
          columns: [{ name: "column_name", type: "text" }, { name: "data_type", type: "text" }],
          rows: [["id", "integer"], ["email", "text"], ["name", "text"], ["created_at", "timestamp without time zone"]],
          rowCount: 4,
          truncated: false,
        },
      },
    ];

    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ messages, title: "What tables do I have?" }),
    });
    expect(res.status).toBe(200);
  });

  it("loads the conversation with all messages preserved", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("What tables do I have?");
    expect(data.messages).toHaveLength(4);

    // Verify first user message
    expect(data.messages[0].role).toBe("user");
    expect(data.messages[0].content).toBe("What tables do I have?");

    // Verify assistant response with reasoning and toolCalls
    expect(data.messages[1].role).toBe("assistant");
    expect(data.messages[1].content).toContain("users");
    expect(data.messages[1].reasoning).toBeTruthy();
    expect(data.messages[1].toolCalls).toHaveLength(1);

    // Verify second assistant response with resultTable
    expect(data.messages[3].role).toBe("assistant");
    expect(data.messages[3].resultTable).toBeTruthy();
    expect(data.messages[3].resultTable.columns).toHaveLength(2);
    expect(data.messages[3].resultTable.rows).toHaveLength(4);

    // Verify toolCalls preserved on second assistant
    expect(data.messages[3].toolCalls).toHaveLength(1);
    expect(data.messages[3].toolCalls[0].tool).toBe("generate_sql");
  });

  it("loads conversation after creating a second one (history ordering)", async () => {
    // Create second conversation
    const res2 = await fetch(`${API}/schema-chat/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ schemaId, title: "Second Chat" }),
    });
    expect(res2.status).toBe(201);
    const conv2 = await res2.json();

    // Load the first conversation — should still be intact
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.messages).toHaveLength(4);
    expect(data.messages[0].content).toBe("What tables do I have?");
  });

  it("deletes the conversation", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);

    // Verify deletion
    const loaded = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(loaded.status).toBe(404);
  });

  it("returns 404 for non-existent conversation", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/nonexistent-id-12345`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(404);
  });
});
