const { Pool } = require("pg");

async function main() {
  console.log("DATABASE_URL from env:", process.env.DATABASE_URL ? `yes (len=${process.env.DATABASE_URL.length})` : "NO");
  console.log("VERCEL_ENV:", process.env.VERCEL_ENV || "unset");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.VERCEL_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    const result = await pool.query("SELECT 1 as ok");
    console.log("QUERY OK:", JSON.stringify(result.rows));
  } catch (err) {
    console.error("QUERY ERROR:", err.message, err.code);
    console.error("QUERY ERROR DETAIL:", err.detail || "none");
  }

  await pool.end();
}

main().catch(console.error);
