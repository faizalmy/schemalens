import { Pool } from "pg";
import type { ParsedSchema, TableInfo, TableColumn, TableRelation } from "./types";

export async function introspectDatabase(connectionString: string): Promise<ParsedSchema> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });

  try {
    const [tables, relations] = await Promise.all([
      discoverTables(pool),
      discoverRelations(pool),
    ]);

    const sortedTables = topologicallySortTables(tables, relations);

    return { tables: sortedTables, relations };
  } finally {
    await pool.end();
  }
}

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

async function discoverTables(pool: Pool): Promise<TableInfo[]> {
  const tablesResult = await pool.query(`
    SELECT
      t.table_name,
      (SELECT reltuples::bigint
       FROM pg_class
       WHERE oid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
      ) AS row_estimate
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  `);

  if (tablesResult.rows.length === 0) return [];

  const columnsResult = await pool.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      EXISTS(
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = c.table_schema
          AND tc.table_name = c.table_name
          AND ku.column_name = c.column_name
      ) AS is_primary_key,
      EXISTS(
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = c.table_schema
          AND tc.table_name = c.table_name
          AND ku.column_name = c.column_name
      ) AS is_unique
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `);

  const columnsByTable = new Map<string, TableColumn[]>();
  for (const col of columnsResult.rows) {
    if (!columnsByTable.has(col.table_name)) {
      columnsByTable.set(col.table_name, []);
    }
    columnsByTable.get(col.table_name)!.push({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === "YES",
      primaryKey: col.is_primary_key,
      defaultValue: col.column_default,
      unique: col.is_unique,
    });
  }

  return tablesResult.rows.map((row) => ({
    name: row.table_name,
    columns: columnsByTable.get(row.table_name) || [],
    rowEstimate: row.row_estimate,
  }));
}

async function discoverRelations(pool: Pool): Promise<TableRelation[]> {
  const result = await pool.query(`
    SELECT
      tc.constraint_name,
      kcu.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);

  return result.rows.map((row) => ({
    fromTable: row.from_table,
    fromColumn: row.from_column,
    toTable: row.to_table,
    toColumn: row.to_column,
    constraintName: row.constraint_name,
  }));
}
