import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Add connectionStringEncrypted column if missing
    await db.execute(sql`
      ALTER TABLE "saved_schemas" ADD COLUMN IF NOT EXISTS "connectionStringEncrypted" text
    `);

    // Create chat_conversations table if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_conversations" (
        "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" text NOT NULL,
        "schemaId" text NOT NULL,
        "title" text DEFAULT 'New Chat' NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // Create chat_messages table if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "conversationId" text NOT NULL,
        "role" text NOT NULL,
        "content" text DEFAULT '' NOT NULL,
        "toolCalls" jsonb,
        "reasoning" text,
        "resultTable" jsonb,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // Add foreign keys (IF NOT EXISTS via DO block)
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "chat_conversations" ADD CONSTRAINT IF NOT EXISTS "chat_conversations_userId_users_id_fk"
          FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "chat_conversations" ADD CONSTRAINT IF NOT EXISTS "chat_conversations_schemaId_saved_schemas_id_fk"
          FOREIGN KEY ("schemaId") REFERENCES "public"."saved_schemas"("id") ON DELETE cascade;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "chat_messages" ADD CONSTRAINT IF NOT EXISTS "chat_messages_conversationId_chat_conversations_id_fk"
          FOREIGN KEY ("conversationId") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    return NextResponse.json({ ok: true, message: "Migrations applied" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
