/**
 * E2E tests for auth API — requires dev server running on localhost:3000
 *
 * These tests run against the real Next.js dev server and real PostgreSQL.
 * Run: npm run dev (in another terminal) && npx vitest run
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const API = "http://localhost:3000/api/auth";
const ORIGIN = { Origin: "http://localhost:3000" };

let testEmail: string;
let sessionTokenCookie: string;
let userId: string;

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

function parseCookie(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

describe("auth API", () => {
  beforeAll(() => {
    testEmail = `e2e-${rand()}@test.dev`;
  });

  it("signs up a new user", async () => {
    const res = await fetch(`${API}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({
        email: testEmail,
        password: "testpass123",
        name: "Test User",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail);
    expect(body.user.name).toBe("Test User");
    expect(body.token).toBeDefined();
    userId = body.user.id;
    sessionTokenCookie = parseCookie(res.headers.get("set-cookie"));
    expect(sessionTokenCookie).toBeTruthy();
  });

  it("rejects duplicate email sign-up", async () => {
    const res = await fetch(`${API}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({
        email: testEmail,
        password: "testpass123",
        name: "Test User",
      }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects sign-up with missing fields", async () => {
    const res = await fetch(`${API}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({ email: testEmail }),
    });
    expect(res.status).toBe(400);
  });

  it("signs in with correct credentials", async () => {
    const res = await fetch(`${API}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({
        email: testEmail,
        password: "testpass123",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail);
    expect(body.token).toBeDefined();
  });

  it("rejects sign-in with wrong password", async () => {
    const res = await fetch(`${API}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({
        email: testEmail,
        password: "wrongpassword",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects sign-in for non-existent user", async () => {
    const res = await fetch(`${API}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ORIGIN },
      body: JSON.stringify({
        email: "nonexistent-" + rand() + "@test.dev",
        password: "testpass123",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("returns session for valid token", async () => {
    const res = await fetch(`${API}/get-session`, {
      headers: {
        Cookie: sessionTokenCookie,
        ...ORIGIN,
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail);
  });

  it("rejects session with invalid token", async () => {
    const res = await fetch(`${API}/get-session`, {
      headers: {
        Cookie: "better-auth.session_token=invalid",
        ...ORIGIN,
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });
});
