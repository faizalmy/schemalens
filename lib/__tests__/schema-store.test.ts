import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createSchema, getSchema, listUserSchemas, deleteSchema, updateAiDocs } from "../schema-store";
import { db } from "../db";
import { users, savedSchemas } from "../db/schema";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "test-user-for-schemalens-tests";
const TEST_USER_EMAIL = "test@schemalens-test.dev";

describe("schema-store", () => {
  beforeAll(async () => {
    // Ensure test user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: "Test User",
        password_hash: "not-a-real-hash",
      });
    }
  });

  afterAll(async () => {
    // Clean up test schemas and user
    await db.delete(savedSchemas).where(eq(savedSchemas.userId, TEST_USER_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
  });

  const sampleSchema = {
    tables: [
      {
        name: "test_table",
        columns: [{ name: "id", type: "uuid", nullable: false, primaryKey: true, defaultValue: null, unique: true }],
        rowEstimate: null,
      },
    ],
    relations: [],
  };

  it("creates a schema and returns its id", async () => {
    const id = await createSchema(TEST_USER_ID, "Test Schema", sampleSchema);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");

    // Clean up
    await deleteSchema(id);
  });

  it("gets a schema by id", async () => {
    const id = await createSchema(TEST_USER_ID, "Test Schema Get", sampleSchema);
    const result = await getSchema(id);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Schema Get");
    expect(result!.userId).toBe(TEST_USER_ID);
    expect(result!.tablesJson).toEqual(sampleSchema);

    await deleteSchema(id);
  });

  it("returns null for non-existent schema", async () => {
    const result = await getSchema("non-existent-id");
    expect(result).toBeNull();
  });

  it("lists schemas for a user", async () => {
    const id1 = await createSchema(TEST_USER_ID, "Schema A", sampleSchema);
    const id2 = await createSchema(TEST_USER_ID, "Schema B", sampleSchema);

    const list = await listUserSchemas(TEST_USER_ID);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((s) => s.name === "Schema A")).toBe(true);
    expect(list.some((s) => s.name === "Schema B")).toBe(true);
    expect(list[0].tableCount).toBeGreaterThanOrEqual(1);

    await deleteSchema(id1);
    await deleteSchema(id2);
  });

  it("updates ai docs", async () => {
    const id = await createSchema(TEST_USER_ID, "Test AI Docs", sampleSchema);
    const docs = { test_table: "This is a test table for testing." };

    await updateAiDocs(id, docs);
    const updated = await getSchema(id);

    expect(updated!.aiDocsJson).toEqual(docs);

    await deleteSchema(id);
  });

  it("deletes a schema", async () => {
    const id = await createSchema(TEST_USER_ID, "To Delete", sampleSchema);
    await deleteSchema(id);

    const result = await getSchema(id);
    expect(result).toBeNull();
  });
});
