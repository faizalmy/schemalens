import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, string> = {};

  // Check env vars
  results["DATABASE_URL set"] = process.env.DATABASE_URL
    ? `yes (len=${process.env.DATABASE_URL.length})`
    : "NO";
  results["VERCEL_ENV"] = process.env.VERCEL_ENV || "unset";

  // Direct pg test
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    results["pg connect"] = "ok";
    const result = await client.query("SELECT 1 as ok");
    results["pg query"] = JSON.stringify(result.rows);
    client.release();
    await pool.end();
  } catch (e: any) {
    results["pg error"] = e?.message || String(e);
    results["pg code"] = e?.code || "none";
  }

  return NextResponse.json(results);
}
