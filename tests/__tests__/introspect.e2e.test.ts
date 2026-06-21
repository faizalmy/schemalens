/**
 * E2E tests for introspection and schema CRUD APIs.
 * Requires dev server running on localhost:3000 + Docker PG on port 5434.
 *
 * Run: npm run dev && npx vitest run tests/__tests__/introspect.e2e.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const AUTH_API = "http://localhost:3000/api/auth";
const API = "http://localhost:3000/api";
const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://schemalens:schemalens_dev@localhost:5434/schemalens_test";

let cookieHeader: string;
const ORIGIN = { Origin: "http://localhost:3000" };

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

function parseCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

async function loginAsTestUser() {
  const email = `e2e-introspect-${rand()}@test.dev`;
  const res = await fetch(`${AUTH_API}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ORIGIN },
    body: JSON.stringify({ email, password: "testpass123", name: "E2E Introspect" }),
  });
  const body = await res.json();
  const cookie = parseCookie(res.headers.get("set-cookie"));
  return { email, userId: body.user.id, cookie };
}

describe("introspect + schema API", () => {
  beforeAll(async () => {
    const session = await loginAsTestUser();
    cookieHeader = session.cookie;
  });

  it("POST /api/introspect — introspects Docker PG and returns schemaId", async () => {
    const res = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        ...ORIGIN,
      },
      body: JSON.stringify({
        connectionString: TEST_DB,
        name: "E2E Test Schema",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaId).toBeDefined();
    expect(typeof body.schemaId).toBe("string");
  });

  it("POST /api/introspect — rejects unauthenticated request", async () => {
    const res = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectionString: TEST_DB,
        name: "Unauthed schema",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/introspect — rejects invalid connection string", async () => {
    const res = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        ...ORIGIN,
      },
      body: JSON.stringify({
        connectionString: "postgresql://invalid:nope@localhost:5432/invalid",
        name: "Invalid schema",
      }),
    });
    expect(res.status).toBe(500);
  });

  it("GET /api/schemas — lists user's schemas", async () => {
    // First create a schema
    await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...ORIGIN },
      body: JSON.stringify({ connectionString: TEST_DB, name: "List Test Schema" }),
    });

    const res = await fetch(`${API}/schemas`, {
      headers: { Cookie: cookieHeader, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].name).toBeDefined();
    expect(body[0].tableCount).toBeGreaterThanOrEqual(0);
    expect(body[0].relationCount).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/schema/[id] — returns full schema for owner", async () => {
    // Introspect to get a schemaId
    const introRes = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...ORIGIN },
      body: JSON.stringify({ connectionString: TEST_DB, name: "Get Test Schema" }),
    });
    const { schemaId } = await introRes.json();

    const res = await fetch(`${API}/schema/${schemaId}`, {
      headers: { Cookie: cookieHeader, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Get Test Schema");
    expect(body.tablesJson).toBeDefined();
    expect(body.tablesJson.tables).toBeDefined();
    expect(body.tablesJson.tables.length).toBeGreaterThanOrEqual(5);
  });

  it("GET /api/schema/[id] — returns 404 for non-existent schema", async () => {
    const res = await fetch(`${API}/schema/nonexistent-id-12345`, {
      headers: { Cookie: cookieHeader, ...ORIGIN },
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/schema/[id] — deletes a schema", async () => {
    const introRes = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...ORIGIN },
      body: JSON.stringify({ connectionString: TEST_DB, name: "Delete Test Schema" }),
    });
    const { schemaId } = await introRes.json();

    const delRes = await fetch(`${API}/schema/${schemaId}`, {
      method: "DELETE",
      headers: { Cookie: cookieHeader, ...ORIGIN },
    });
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const getRes = await fetch(`${API}/schema/${schemaId}`, {
      headers: { Cookie: cookieHeader, ...ORIGIN },
    });
    expect(getRes.status).toBe(404);
  });

  it("DELETE /api/schema/[id] — rejects unauthorized deletion", async () => {
    const res = await fetch(`${API}/schema/some-id`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });
});
