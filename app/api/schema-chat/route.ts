import { auth } from "@/lib/auth";
import { getSchema, getConnectionString } from "@/lib/schema-store";
import { decrypt } from "@/lib/encryption";
import { runSchemaChat } from "@/lib/schema-chat/agent";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ParsedSchema } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rateLimited = checkRateLimit(session.user.id, "schema-chat");
  if (rateLimited) return rateLimited;

  const { schemaId, message, history } = await request.json();
  if (!schemaId || !message) {
    return new Response(
      JSON.stringify({ error: "schemaId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const schema = await getSchema(schemaId);
  if (!schema || schema.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encrypted = await getConnectionString(schemaId);
  let connectionString = "";
  if (encrypted) {
    try {
      connectionString = decrypt(encrypted);
    } catch {
      connectionString = "";
    }
  }

  const parsedSchema = schema.tablesJson as ParsedSchema;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = runSchemaChat(
          message,
          parsedSchema,
          () => connectionString,
          { history },
        );

        for await (const event of generator) {
          const data = JSON.stringify(event);
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        }

        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "done" })}\n\n`,
          ),
        );
      } catch (err: unknown) {
        const errorEvent = JSON.stringify({
          type: "error",
          content:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred",
        });
        controller.enqueue(new TextEncoder().encode(`data: ${errorEvent}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
