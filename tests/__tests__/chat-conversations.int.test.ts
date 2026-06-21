/**
 * Integration tests for chat conversation persistence API.
 * Requires dev server running on localhost:3000.
 *
 * Run: npm run dev (in another terminal) && npx vitest run tests/__tests__/chat-conversations.int.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";

const API = "http://localhost:3000/api";
const ORIGIN = { Origin: "http://localhost:3000" };
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

describe("Chat Conversations API — CRUD", () => {
  beforeAll(async () => {
    // Sign up a fresh user for test isolation
    const email = `chat-int-${rand()}@test.dev`;
    const res = await fetch(`${API}/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({ email, password: "testpass123", name: "Chat Test" }),
    });
    expect(res.status).toBe(200);
    sessionCookie = parseCookie(res.headers.get("set-cookie"));
    expect(sessionCookie).toBeTruthy();

    // Create a schema via introspect (same pattern as share tests)
    const schemaRes = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ connectionString: TEST_DB, name: `Chat Test Schema ${rand()}` }),
    });
    expect(schemaRes.status).toBe(200);
    const schema = await schemaRes.json();
    schemaId = schema.schemaId;
    expect(schemaId).toBeTruthy();
  });

  it("POST /api/schema-chat/conversations — creates a new conversation", async () => {
    const res = await fetch(`${API}/schema-chat/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ schemaId, title: "Test Chat" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(data.title).toBe("Test Chat");
    convId = data.id;
  });

  it("POST /api/schema-chat/conversations — rejects without auth", async () => {
    const res = await fetch(`${API}/schema-chat/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({ schemaId }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/schema-chat/conversations?schemaId=x — lists conversations", async () => {
    const res = await fetch(`${API}/schema-chat/conversations?schemaId=${schemaId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((c: any) => c.id === convId)).toBe(true);
  });

  it("GET /api/schema-chat/conversations — rejects without schemaId", async () => {
    const res = await fetch(`${API}/schema-chat/conversations`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/schema-chat/conversations — rejects without auth", async () => {
    const res = await fetch(`${API}/schema-chat/conversations?schemaId=${schemaId}`, {
      method: "GET",
      headers: ORIGIN,
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/schema-chat/conversations/[id] — loads conversation details", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(convId);
    expect(data.messages).toEqual([]);
  });

  it("GET /api/schema-chat/conversations/[id] — rejects without auth", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: ORIGIN,
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/schema-chat/conversations/[id] — returns 404 for wrong user", async () => {
    // Sign up a different user
    const email2 = `chat-int-${rand()}@test.dev`;
    const res2 = await fetch(`${API}/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({ email: email2, password: "testpass123", name: "Other User" }),
    });
    expect(res2.status).toBe(200);
    const otherCookie = parseCookie(res2.headers.get("set-cookie"));

    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: otherCookie, ...ORIGIN },
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/schema-chat/conversations/[id] — saves messages and updates title", async () => {
    const messages = [
      { role: "user", content: "List all tables" },
      { role: "assistant", content: "Here are the tables:", toolCalls: [{ id: "tc1", tool: "generate_sql", input: { query: "SELECT * FROM pg_tables" } }] },
    ];
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie, ...ORIGIN },
      body: JSON.stringify({ messages, title: "List all tables" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    // Verify messages persisted
    const loaded = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    const data = await loaded.json();
    expect(data.title).toBe("List all tables");
    expect(data.messages).toHaveLength(2);
    expect(data.messages[0].role).toBe("user");
    expect(data.messages[0].content).toBe("List all tables");
    expect(data.messages[1].role).toBe("assistant");
    expect(data.messages[1].content).toBe("Here are the tables:");
    expect(data.messages[1].toolCalls).toHaveLength(1);
  });

  it("PATCH /api/schema-chat/conversations/[id] — rejects without auth", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({ title: "Hacked" }),
    });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/schema-chat/conversations/[id] — deletes conversation", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    // Verify it's gone
    const loaded = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "GET",
      headers: { Cookie: sessionCookie, ...ORIGIN },
    });
    expect(loaded.status).toBe(404);
  });

  it("DELETE /api/schema-chat/conversations/[id] — rejects without auth", async () => {
    const res = await fetch(`${API}/schema-chat/conversations/${convId}`, {
      method: "DELETE",
      headers: ORIGIN,
    });
    expect(res.status).toBe(401);
  });
});
