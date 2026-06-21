import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chatConversations,
  chatMessages,
} from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * GET /api/schema-chat/conversations?schemaId=xxx
 *   → List conversations for a schema
 * POST /api/schema-chat/conversations
 *   → Create a new conversation
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const schemaId = url.searchParams.get("schemaId");

  if (!schemaId) {
    return new Response(
      JSON.stringify({ error: "schemaId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const conversations = await db
    .select({
      id: chatConversations.id,
      title: chatConversations.title,
      createdAt: chatConversations.createdAt,
      updatedAt: chatConversations.updatedAt,
    })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.schemaId, schemaId),
        eq(chatConversations.userId, session.user.id),
      ),
    )
    .orderBy(desc(chatConversations.updatedAt))
    .limit(50);

  return new Response(JSON.stringify(conversations), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { schemaId, title } = await request.json();
  if (!schemaId) {
    return new Response(
      JSON.stringify({ error: "schemaId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const [conv] = await db
    .insert(chatConversations)
    .values({
      userId: session.user.id,
      schemaId,
      title: title || "New Chat",
    })
    .returning({
      id: chatConversations.id,
      title: chatConversations.title,
      createdAt: chatConversations.createdAt,
      updatedAt: chatConversations.updatedAt,
    });

  return new Response(JSON.stringify(conv), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
