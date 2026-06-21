import { auth } from "@/lib/auth";
import { getSchema, getConnectionString } from "@/lib/schema-store";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { schemaId, tableName, limit = 25 } = await request.json();
  if (!schemaId || !tableName) {
    return NextResponse.json(
      { error: "schemaId and tableName are required" },
      { status: 400 },
    );
  }

  // Verify ownership
  const schema = await getSchema(schemaId);
  if (!schema || schema.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get and decrypt connection string
  const encrypted = await getConnectionString(schemaId);
  if (!encrypted) {
    return NextResponse.json(
      { error: "Connection string not stored for this schema. Re-connect to enable live preview." },
      { status: 400 },
    );
  }

  let connectionString: string;
  try {
    connectionString = decrypt(encrypted);
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt connection string" },
      { status: 500 },
    );
  }

  try {
    // Dynamically import pg to avoid bundling it on the client
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
    const client = await pool.connect();

    // Sanitize table name — only allow alphanumeric, underscore, schema-qualified
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(tableName)) {
      client.release();
      await pool.end();
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    const result = await client.query(`SELECT * FROM ${tableName} LIMIT $1`, [limit]);
    client.release();
    await pool.end();

    return NextResponse.json({
      columns: result.fields.map((f: any) => ({
        name: f.name,
        type: f.dataTypeID,
      })),
      rows: result.rows,
      rowCount: result.rows.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Query failed" },
      { status: 500 },
    );
  }
}
