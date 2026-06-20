import { db } from "@/lib/db";
import { savedSchemas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params;

  const result = await db
    .select()
    .from(savedSchemas)
    .where(eq(savedSchemas.shareId, shareToken))
    .limit(1);

  const schema = result[0];
  if (!schema) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: schema.name,
    tablesJson: schema.tablesJson,
    aiDocsJson: schema.aiDocsJson,
  });
}
