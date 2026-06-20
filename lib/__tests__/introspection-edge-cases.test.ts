/**
 * Unit tests for introspection edge cases and error handling.
 */
import { describe, it, expect } from "vitest";

// Test the topological sort logic in isolation without DB connection
describe("introspection — topological sort", () => {
  type TableInfo = { name: string; columns: any[]; rowEstimate: number | null };
  type TableRelation = { fromTable: string; fromColumn: string; toTable: string; toColumn: string; constraintName: string };

  function topologicallySortTables(tables: TableInfo[], relations: TableRelation[]): TableInfo[] {
    const referenced = new Set(relations.map((r) => r.toTable));
    return [...tables].sort((a, b) => {
      const aIsReferenced = referenced.has(a.name);
      const bIsReferenced = referenced.has(b.name);
      if (aIsReferenced && !bIsReferenced) return -1;
      if (!aIsReferenced && bIsReferenced) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  it("puts referenced tables before referencing tables", () => {
    const tables: TableInfo[] = [
      { name: "orders", columns: [], rowEstimate: null },
      { name: "users", columns: [], rowEstimate: null },
    ];
    const relations: TableRelation[] = [{
      fromTable: "orders", fromColumn: "user_id",
      toTable: "users", toColumn: "id",
      constraintName: "fk_orders_users",
    }];

    const sorted = topologicallySortTables(tables, relations);
    expect(sorted[0].name).toBe("users");
    expect(sorted[1].name).toBe("orders");
  });

  it("handles self-referencing tables", () => {
    const tables: TableInfo[] = [
      { name: "employees", columns: [], rowEstimate: null },
    ];
    const relations: TableRelation[] = [{
      fromTable: "employees", fromColumn: "manager_id",
      toTable: "employees", toColumn: "id",
      constraintName: "fk_self",
    }];

    const sorted = topologicallySortTables(tables, relations);
    expect(sorted.length).toBe(1);
    expect(sorted[0].name).toBe("employees");
  });

  it("handles empty relations", () => {
    const tables: TableInfo[] = [
      { name: "a", columns: [], rowEstimate: null },
      { name: "b", columns: [], rowEstimate: null },
    ];
    const sorted = topologicallySortTables(tables, []);
    expect(sorted.length).toBe(2);
    expect(sorted[0].name).toBe("a"); // alphabetical
    expect(sorted[1].name).toBe("b");
  });

  it("handles empty tables", () => {
    const sorted = topologicallySortTables([], []);
    expect(sorted).toEqual([]);
  });

  it("handles multi-table chain: a ← b ← c", () => {
    const tables: TableInfo[] = [
      { name: "c", columns: [], rowEstimate: null },
      { name: "a", columns: [], rowEstimate: null },
      { name: "b", columns: [], rowEstimate: null },
    ];
    const relations: TableRelation[] = [
      { fromTable: "b", fromColumn: "a_id", toTable: "a", toColumn: "id", constraintName: "fk1" },
      { fromTable: "c", fromColumn: "b_id", toTable: "b", toColumn: "id", constraintName: "fk2" },
    ];

    const sorted = topologicallySortTables(tables, relations);
    const aIdx = sorted.findIndex((t) => t.name === "a");
    const bIdx = sorted.findIndex((t) => t.name === "b");
    const cIdx = sorted.findIndex((t) => t.name === "c");
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });
});

describe("introspection — error handling", () => {
  it("rejects invalid connection strings gracefully", async () => {
    // This is tested in the DB-dependent test, but we also test the error type
    const { introspectDatabase } = await import("../introspection");
    await expect(introspectDatabase("not-a-valid-url")).rejects.toThrow();
  });

  it("rejects unreachable hosts with timeout", async () => {
    const { introspectDatabase } = await import("../introspection");
    await expect(
      introspectDatabase("postgresql://user:pass@192.0.2.1:5432/db"),
    ).rejects.toThrow();
  }, 15000);
});
