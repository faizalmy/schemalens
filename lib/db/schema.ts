import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  name: text().notNull(),
  image: text(),
  password_hash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const savedSchemas = pgTable("saved_schemas", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  dbType: text().notNull().default("aurora-postgresql"),
  tablesJson: jsonb().notNull(),
  aiDocsJson: jsonb(),
  shareId: text().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  savedSchemas: many(savedSchemas),
}));

export const savedSchemasRelations = relations(savedSchemas, ({ one }) => ({
  user: one(users, {
    fields: [savedSchemas.userId],
    references: [users.id],
  }),
}));
