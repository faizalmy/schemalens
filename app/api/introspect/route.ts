import { auth } from "@/lib/auth";
import { introspectDatabase } from "@/lib/introspection";
import { createSchema } from "@/lib/schema-store";
import { encrypt } from "@/lib/encryption";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimited = checkRateLimit(session.user.id, "introspect");
  if (rateLimited) return rateLimited;

  const { connectionString, name } = await request.json();
  if (!connectionString || !name) {
    return NextResponse.json(
      { error: "connectionString and name are required" },
      { status: 400 },
    );
  }

  try {
    const schema = await introspectDatabase(connectionString);
    const encrypted = encrypt(connectionString);
    const schemaId = await createSchema(session.user.id, name, schema, encrypted);
    return NextResponse.json({ schemaId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Introspection failed" },
      { status: 500 },
    );
  }
}
