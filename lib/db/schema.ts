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

export const sessions = pgTable("sessions", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  token: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
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
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const savedSchemasRelations = relations(savedSchemas, ({ one }) => ({
  user: one(users, {
    fields: [savedSchemas.userId],
    references: [users.id],
  }),
}));
