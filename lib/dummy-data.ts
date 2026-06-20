// Pure frontend dummy data — no backend, no database.

import type { TableColumn, TableRelation, TableInfo, ParsedSchema, SchemaMeta } from './types'

export type { TableColumn, TableRelation, TableInfo, ParsedSchema, SchemaMeta }

function col(
  name: string,
  type: string,
  opts: Partial<Omit<TableColumn, 'name' | 'type'>> = {}
): TableColumn {
  return {
    name,
    type,
    nullable: opts.nullable ?? false,
    primaryKey: opts.primaryKey ?? false,
    defaultValue: opts.defaultValue ?? null,
    unique: opts.unique ?? false,
  }
}

// ---- Schema 1: E-commerce production database ----
const ecommerceSchema: ParsedSchema = {
  tables: [
    {
      name: 'users',
      rowEstimate: 48213,
      columns: [
        col('id', 'uuid', { primaryKey: true }),
        col('email', 'varchar(255)', { unique: true }),
        col('full_name', 'varchar(120)'),
        col('password_hash', 'text'),
        col('is_active', 'boolean', { defaultValue: 'true' }),
        col('created_at', 'timestamptz', { defaultValue: 'now()' }),
        col('updated_at', 'timestamptz', { defaultValue: 'now()' }),
      ],
    },
    {
      name: 'addresses',
      rowEstimate: 61204,
      columns: [
        col('id', 'uuid', { primaryKey: true }),
        col('user_id', 'uuid'),
        col('line1', 'varchar(255)'),
        col('line2', 'varchar(255)', { nullable: true }),
        col('city', 'varchar(120)'),
        col('postal_code', 'varchar(20)'),
        col('country', 'char(2)'),
        col('is_default', 'boolean', { defaultValue: 'false' }),
      ],
    },
    {
      name: 'categories',
      rowEstimate: 84,
      columns: [
        col('id', 'serial', { primaryKey: true }),
        col('name', 'varchar(120)', { unique: true }),
        col('slug', 'varchar(140)', { unique: true }),
        col('parent_id', 'integer', { nullable: true }),
      ],
    },
    {
      name: 'products',
      rowEstimate: 12750,
      columns: [
        col('id', 'uuid', { primaryKey: true }),
        col('category_id', 'integer'),
        col('sku', 'varchar(40)', { unique: true }),
        col('title', 'varchar(200)'),
        col('description', 'text', { nullable: true }),
        col('price_cents', 'integer'),
        col('stock', 'integer', { defaultValue: '0' }),
        col('created_at', 'timestamptz', { defaultValue: 'now()' }),
      ],
    },
    {
      name: 'orders',
      rowEstimate: 92840,
      columns: [
        col('id', 'uuid', { primaryKey: true }),
        col('user_id', 'uuid'),
        col('shipping_address_id', 'uuid', { nullable: true }),
        col('status', 'varchar(20)', { defaultValue: "'pending'" }),
        col('total_cents', 'integer'),
        col('placed_at', 'timestamptz', { defaultValue: 'now()' }),
      ],
    },
    {
      name: 'order_items',
      rowEstimate: 241509,
      columns: [
        col('id', 'bigserial', { primaryKey: true }),
        col('order_id', 'uuid'),
        col('product_id', 'uuid'),
        col('quantity', 'integer', { defaultValue: '1' }),
        col('unit_price_cents', 'integer'),
      ],
    },
    {
      name: 'reviews',
      rowEstimate: 33910,
      columns: [
        col('id', 'bigserial', { primaryKey: true }),
        col('product_id', 'uuid'),
        col('user_id', 'uuid'),
        col('rating', 'smallint'),
        col('body', 'text', { nullable: true }),
        col('created_at', 'timestamptz', { defaultValue: 'now()' }),
      ],
    },
  ],
  relations: [
    { fromTable: 'addresses', fromColumn: 'user_id', toTable: 'users', toColumn: 'id', constraintName: 'addresses_user_id_fkey' },
    { fromTable: 'categories', fromColumn: 'parent_id', toTable: 'categories', toColumn: 'id', constraintName: 'categories_parent_id_fkey' },
    { fromTable: 'products', fromColumn: 'category_id', toTable: 'categories', toColumn: 'id', constraintName: 'products_category_id_fkey' },
    { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id', constraintName: 'orders_user_id_fkey' },
    { fromTable: 'orders', fromColumn: 'shipping_address_id', toTable: 'addresses', toColumn: 'id', constraintName: 'orders_shipping_address_id_fkey' },
    { fromTable: 'order_items', fromColumn: 'order_id', toTable: 'orders', toColumn: 'id', constraintName: 'order_items_order_id_fkey' },
    { fromTable: 'order_items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id', constraintName: 'order_items_product_id_fkey' },
    { fromTable: 'reviews', fromColumn: 'product_id', toTable: 'products', toColumn: 'id', constraintName: 'reviews_product_id_fkey' },
    { fromTable: 'reviews', fromColumn: 'user_id', toTable: 'users', toColumn: 'id', constraintName: 'reviews_user_id_fkey' },
  ],
}

// ---- Schema 2: Analytics database ----
const analyticsSchema: ParsedSchema = {
  tables: [
    {
      name: 'accounts',
      rowEstimate: 1820,
      columns: [
        col('id', 'uuid', { primaryKey: true }),
        col('name', 'varchar(160)'),
        col('plan', 'varchar(20)', { defaultValue: "'free'" }),
        col('created_at', 'timestamptz', { defaultValue: 'now()' }),
      ],
    },
    {
      name: 'sessions',
      rowEstimate: 904521,
      columns: [
        col('id', 'uuid', { primaryKey: true }),
        col('account_id', 'uuid'),
        col('device', 'varchar(40)'),
        col('started_at', 'timestamptz'),
        col('ended_at', 'timestamptz', { nullable: true }),
      ],
    },
    {
      name: 'events',
      rowEstimate: 14820391,
      columns: [
        col('id', 'bigserial', { primaryKey: true }),
        col('session_id', 'uuid'),
        col('account_id', 'uuid'),
        col('name', 'varchar(80)'),
        col('properties', 'jsonb', { nullable: true }),
        col('occurred_at', 'timestamptz', { defaultValue: 'now()' }),
      ],
    },
  ],
  relations: [
    { fromTable: 'sessions', fromColumn: 'account_id', toTable: 'accounts', toColumn: 'id', constraintName: 'sessions_account_id_fkey' },
    { fromTable: 'events', fromColumn: 'session_id', toTable: 'sessions', toColumn: 'id', constraintName: 'events_session_id_fkey' },
    { fromTable: 'events', fromColumn: 'account_id', toTable: 'accounts', toColumn: 'id', constraintName: 'events_account_id_fkey' },
  ],
}

interface FullSchema {
  meta: SchemaMeta
  schema: ParsedSchema
  aiDocumentation: string | null
}

const ecommerceDocs = `# E-commerce Schema Overview

This database powers a typical online storefront. It is organized around customers, the catalog, and the ordering pipeline.

## Core entities

- **users** — Registered customers. The root of most relationships; \`email\` is unique.
- **addresses** — Shipping and billing addresses, each tied to a user. One user can have many addresses, with one marked as default.
- **categories** — A self-referencing tree of product categories via \`parent_id\`.
- **products** — Catalog items, each belonging to a category. \`sku\` is unique and \`price_cents\` stores money as integers to avoid float rounding.

## Order pipeline

- **orders** — A placed order, owned by a user and optionally linked to a shipping address. \`status\` tracks lifecycle (pending, paid, shipped, etc.).
- **order_items** — Line items connecting orders to products, capturing quantity and the unit price at purchase time.
- **reviews** — User-submitted product ratings and feedback.

## Notable relationships

The \`order_items\` table is the join between \`orders\` and \`products\`, forming a many-to-many bridge. Both \`reviews\` and \`orders\` reference \`users\`, making it the most connected table in the schema.`

export const dummySchemas: SchemaMeta[] = [
  {
    id: 'prod-ecommerce',
    name: 'Production — Storefront',
    host: 'shop-cluster.cluster-abc123.us-east-1.rds.amazonaws.com',
    database: 'storefront',
    tableCount: ecommerceSchema.tables.length,
    relationCount: ecommerceSchema.relations.length,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6h ago
  },
  {
    id: 'analytics',
    name: 'Analytics Warehouse',
    host: 'analytics.cluster-xyz789.us-west-2.rds.amazonaws.com',
    database: 'analytics',
    tableCount: analyticsSchema.tables.length,
    relationCount: analyticsSchema.relations.length,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3d ago
  },
]

const fullSchemas: Record<string, FullSchema> = {
  'prod-ecommerce': {
    meta: dummySchemas[0],
    schema: ecommerceSchema,
    aiDocumentation: ecommerceDocs,
  },
  analytics: {
    meta: dummySchemas[1],
    schema: analyticsSchema,
    aiDocumentation: null,
  },
}

// Any unknown id (e.g. a freshly "connected" demo db) falls back to the e-commerce sample.
export function getDummySchema(id: string): FullSchema {
  return fullSchemas[id] ?? fullSchemas['prod-ecommerce']
}

// Used by the AI Docs panel to fake a generation result.
export const sampleGeneratedDocs = ecommerceDocs
