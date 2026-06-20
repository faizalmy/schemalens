import { describe, it, expect } from "vitest";
import { introspectDatabase } from "../introspection";

const TEST_DB =
  "postgresql://schemalens:schemalens_dev@localhost:5434/schemalens";

describe("introspection engine", () => {
  it("discovers tables and relations from our own docker postgres", async () => {
    const schema = await introspectDatabase(TEST_DB);

    // Our dev DB has 5 tables: users, sessions, accounts, verifications, saved_schemas
    expect(schema.tables.length).toBeGreaterThanOrEqual(5);
    expect(schema.relations.length).toBeGreaterThanOrEqual(3);

    // Verify specific tables exist
    const tableNames = schema.tables.map((t) => t.name);
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("accounts");
    expect(tableNames).toContain("verifications");
    expect(tableNames).toContain("saved_schemas");
  });

  it("discovers columns with correct metadata for users table", async () => {
    const schema = await introspectDatabase(TEST_DB);
    const users = schema.tables.find((t) => t.name === "users");
    expect(users).toBeDefined();

    const email = users!.columns.find((c) => c.name === "email");
    expect(email).toBeDefined();
    expect(email!.type).toBe("text");
    expect(email!.nullable).toBe(false);
    expect(email!.unique).toBe(true);

    const id = users!.columns.find((c) => c.name === "id");
    expect(id).toBeDefined();
    expect(id!.primaryKey).toBe(true);
  });

  it("discovers foreign key relations", async () => {
    const schema = await introspectDatabase(TEST_DB);

    // sessions.userId → users.id
    const sessionRel = schema.relations.find(
      (r) => r.fromTable === "sessions" && r.toTable === "users",
    );
    expect(sessionRel).toBeDefined();
    expect(sessionRel!.fromColumn).toBe("userId");
    expect(sessionRel!.toColumn).toBe("id");

    // saved_schemas.userId → users.id
    const schemaRel = schema.relations.find(
      (r) => r.fromTable === "saved_schemas" && r.toTable === "users",
    );
    expect(schemaRel).toBeDefined();
    expect(schemaRel!.fromColumn).toBe("userId");
  });

  it("topologically sorts tables (referenced before referencing)", async () => {
    const schema = await introspectDatabase(TEST_DB);
    const names = schema.tables.map((t) => t.name);

    // 'users' should come before 'sessions', 'accounts', 'saved_schemas'
    // since those reference users.id
    const usersIdx = names.indexOf("users");
    const sessionsIdx = names.indexOf("sessions");
    const accountsIdx = names.indexOf("accounts");
    const schemasIdx = names.indexOf("saved_schemas");

    expect(usersIdx).toBeLessThan(sessionsIdx);
    expect(usersIdx).toBeLessThan(accountsIdx);
    expect(usersIdx).toBeLessThan(schemasIdx);
  });

  it("rejects invalid connection string", async () => {
    await expect(
      introspectDatabase("postgresql://invalid:invalid@localhost:5432/nonexistent"),
    ).rejects.toThrow();
  });
});
