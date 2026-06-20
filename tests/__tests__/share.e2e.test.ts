/**
 * E2E tests for share API — requires dev server + Docker PG.
 */
import { describe, it, expect, beforeAll } from "vitest";

const AUTH_API = "http://localhost:3000/api/auth";
const API = "http://localhost:3000/api";
const TEST_DB = "postgresql://schemalens:schemalens_dev@localhost:5434/schemalens";

let cookieHeader: string;

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

function parseCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

const ORIGIN = { Origin: "http://localhost:3000" };

async function loginAsTestUser() {
  const email = `e2e-share-${rand()}@test.dev`;
  const res = await fetch(`${AUTH_API}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ORIGIN },
    body: JSON.stringify({ email, password: "testpass123", name: "E2E Share" }),
  });
  const cookie = parseCookie(res.headers.get("set-cookie"));
  return { cookie };
}

describe("share API", () => {
  let shareUrl: string;
  let schemaId: string;

  beforeAll(async () => {
    const session = await loginAsTestUser();
    cookieHeader = session.cookie;

    // Create a schema to share
    const introRes = await fetch(`${API}/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...ORIGIN },
      body: JSON.stringify({ connectionString: TEST_DB, name: "Share Test" }),
    });
    const introBody = await introRes.json();
    schemaId = introBody.schemaId;
  });

  it("POST /api/schema/[id]/share — generates a share link", async () => {
    const res = await fetch(`${API}/schema/${schemaId}/share`, {
      method: "POST",
      headers: { Cookie: cookieHeader, ...ORIGIN },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shareId).toBeDefined();
    expect(body.shareId.length).toBe(8);
    expect(body.url).toBeDefined();
    expect(body.url).toContain("/share/");
    shareUrl = body.url;
  });

  it("GET /api/share/[shareToken] — returns schema data (no auth required)", async () => {
    const shareId = shareUrl.split("/share/")[1];
    const res = await fetch(`${API}/share/${shareId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Share Test");
    expect(body.tablesJson).toBeDefined();
    expect(body.tablesJson.tables).toBeDefined();
  });

  it("GET /api/share/[shareToken] — returns 404 for invalid token", async () => {
    const res = await fetch(`${API}/share/invalid123`);
    expect(res.status).toBe(404);
  });

  it("POST /api/schema/[id]/share — rejects unauthenticated", async () => {
    const res = await fetch(`${API}/schema/${schemaId}/share`, {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});
