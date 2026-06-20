import { auth } from "@/lib/auth";
import { getSchema, db } from "@/lib/schema-store";
import { savedSchemas } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const schema = await getSchema(id);
  if (!schema || schema.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [result] = await db
    .select({ id: sql<string>`substr(gen_random_uuid()::text, 1, 8)` })
    .from(savedSchemas)
    .limit(1);

  const shareId = result.id;

  await db
    .update(savedSchemas)
    .set({ shareId })
    .where(eq(savedSchemas.id, id));

  return NextResponse.json({ shareId, url: `/share/${shareId}` });
}
