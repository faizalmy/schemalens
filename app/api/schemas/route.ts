import { auth } from "@/lib/auth";
import { listUserSchemas } from "@/lib/schema-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schemas = await listUserSchemas(session.user.id);
  return NextResponse.json(schemas);
}
