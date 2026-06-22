import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, string> = {};

  // Test 1: env var check
  results["DATABASE_URL set"] = process.env.DATABASE_URL
    ? `yes (len=${process.env.DATABASE_URL.length}, prefix: ${process.env.DATABASE_URL.slice(0, 20)}...)`
    : "NO";
  results["BETTER_AUTH_SECRET set"] = process.env.BETTER_AUTH_SECRET
    ? "yes"
    : "NO";
  results["BETTER_AUTH_URL set"] = process.env.BETTER_AUTH_URL || "NO";

  // Test 2: pg direct
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();
    const r = await client.query("SELECT 1 as ok");
    results["db"] = JSON.stringify(r.rows);
    client.release();
    await pool.end();
  } catch (e: any) {
    results["db error"] = `${e?.message || e}`.slice(0, 200);
    results["db code"] = e?.code || "none";
  }

  // Test 3: better-auth handler crash test
  try {
    const { auth } = await import("../../../../lib/auth");
    results["auth init"] = "ok";

    // Try creating a simple request to the sign-in handler
    // This simulates what better-auth does internally
    const req = new Request(
      "https://schemalens-alpha.vercel.app/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "x" }),
      }
    );
    const resp = await auth.handler(req);
    results["auth handler"] = `status=${resp.status}`;
    const body = await resp.text();
    results["auth body"] = body.slice(0, 200);
  } catch (e: any) {
    results["auth error"] = `${e?.message || e}`.slice(0, 300);
    results["auth error name"] = e?.name || "none";
    results["auth stack"] = (e?.stack || "").split("\n").slice(0, 3).join(" | ");
  }

  return NextResponse.json(results);
}
