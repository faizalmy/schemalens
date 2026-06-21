import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chatConversations,
  chatMessages,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

/**
 * GET /api/schema-chat/conversations/[id] — load conversation + messages
 * DELETE /api/schema-chat/conversations/[id] — delete conversation
 * PATCH /api/schema-chat/conversations/[id] — update title / save messages
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: _request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;

  // Verify ownership
  const [conv] = await db
    .select({ id: chatConversations.id, userId: chatConversations.userId })
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1);

  if (!conv || conv.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(asc(chatMessages.createdAt));

  const [conversation] = await db
    .select({
      id: chatConversations.id,
      title: chatConversations.title,
      createdAt: chatConversations.createdAt,
      updatedAt: chatConversations.updatedAt,
    })
    .from(chatConversations)
    .where(eq(chatConversations.id, id));

  return new Response(
    JSON.stringify({ ...conversation, messages }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: _request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;

  const [conv] = await db
    .select({ id: chatConversations.id, userId: chatConversations.userId })
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1);

  if (!conv || conv.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cascade delete handles messages
  await db.delete(chatConversations).where(eq(chatConversations.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: _request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const body = await _request.json();

  // Verify ownership
  const [conv] = await db
    .select({ id: chatConversations.id, userId: chatConversations.userId })
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1);

  if (!conv || conv.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Update title
  if (body.title) {
    await db
      .update(chatConversations)
      .set({ title: body.title })
      .where(eq(chatConversations.id, id));
  }

  // Save messages (replace all — clear old, insert new)
  if (body.messages) {
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, id));

    if (body.messages.length > 0) {
      const now = new Date();
      const rows = body.messages.map((msg: any, i: number) => ({
        conversationId: id,
        role: msg.role,
        content: msg.content || "",
        toolCalls: msg.toolCalls || null,
        reasoning: msg.reasoning || null,
        resultTable: msg.resultTable || null,
        createdAt: new Date(now.getTime() + i), // preserve order
      }));
      await db.insert(chatMessages).values(rows);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
