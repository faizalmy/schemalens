import { auth } from "@/lib/auth";
import { getSchema, updateAiDocs } from "@/lib/schema-store";
import { generateTableDocs } from "@/lib/ai-docs";
import { NextResponse } from "next/server";
import type { ParsedSchema } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { schemaId } = await request.json();
  if (!schemaId) {
    return NextResponse.json({ error: "schemaId is required" }, { status: 400 });
  }

  const schema = await getSchema(schemaId);
  if (!schema || schema.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const docs = await generateTableDocs(schema.tablesJson as ParsedSchema);
    await updateAiDocs(schemaId, docs);
    return NextResponse.json({ docs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Documentation generation failed" },
      { status: 500 },
    );
  }
}
