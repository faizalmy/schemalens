import { db } from "./db";

export { db };
import { savedSchemas } from "./db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function createSchema(
  userId: string,
  name: string,
  tablesJson: unknown,
  connectionStringEncrypted?: string,
): Promise<string> {
  const result = await db
    .insert(savedSchemas)
    .values({ userId, name, tablesJson, connectionStringEncrypted })
    .returning({ id: savedSchemas.id });

  return result[0].id;
}

export async function getSchema(id: string) {
  const result = await db
    .select()
    .from(savedSchemas)
    .where(eq(savedSchemas.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getConnectionString(id: string): Promise<string | null> {
  const result = await db
    .select({ connectionStringEncrypted: savedSchemas.connectionStringEncrypted })
    .from(savedSchemas)
    .where(eq(savedSchemas.id, id))
    .limit(1);

  return result[0]?.connectionStringEncrypted ?? null;
}

export async function listUserSchemas(userId: string) {
  return db
    .select({
      id: savedSchemas.id,
      name: savedSchemas.name,
      tableCount:
        sql<number>`jsonb_array_length(${savedSchemas.tablesJson}->'tables')`,
      relationCount:
        sql<number>`jsonb_array_length(${savedSchemas.tablesJson}->'relations')`,
      createdAt: savedSchemas.createdAt,
    })
    .from(savedSchemas)
    .where(eq(savedSchemas.userId, userId))
    .orderBy(desc(savedSchemas.createdAt));
}

export async function deleteSchema(id: string) {
  await db.delete(savedSchemas).where(eq(savedSchemas.id, id));
}

export async function updateAiDocs(id: string, aiDocsJson: unknown) {
  await db
    .update(savedSchemas)
    .set({ aiDocsJson })
    .where(eq(savedSchemas.id, id));
}
