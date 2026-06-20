---
tags: [hackathon, architecture, schemalens, h0]
created: 2026-06-19
status: draft
version: 1.0
related:
  - "[[PRD]]"
  - "[[decisions]]"
---

# SchemaLens — Architecture

> **Product requirements:** See [[PRD]] for features, market, and user workflows.
> **Decision rationale:** See [[decisions]] for why we made these choices.

## 1. System Overview

```
┌──────────────────────────────────────────────────────────┐
│                     User Browser                          │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              Vercel (Next.js 16 App Router)               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐          │
│  │ Connect  │  │ Explorer │  │ Share Page    │          │
│  │   Page   │  │  Page    │  │ (ISR static)  │          │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘          │
│       │             │                │                    │
│       │    ┌────────┴────────┐       │                    │
│       │    │  SchemaLens     │       │                    │
│       │    │  Core Engine    │       │                    │
│       │    └────────┬────────┘       │                    │
└───────┼─────────────┼────────────────┼────────────────────┘
        │             │                │
        ▼             ▼                │
┌──────────────────────────────────────┼────────────────────┐
│                    AWS Cloud          │                    │
│  ┌─────────────────────┐             │                    │
│  │  Aurora PostgreSQL  │             │                    │
│  │  (System Catalog)   │◄── Introspection queries         │
│  │  (User Data Store)  │◄── Schemas, docs, user accounts  │
│  └─────────────────────┘             │                    │
└──────────────────────────────────────────────────────────┘
```

## 2. Tech Stack

**No separate backend.** Next.js App Router handles all server-side logic — Server Components for reads, Server Actions for mutations, API routes for explicit endpoints. The entire stack is just Vercel + Aurora PostgreSQL.

| Layer | Technology | Why |
|-------|-----------|-----|
| App (Frontend + Backend) | Next.js 16 (App Router), React, TypeScript | Server Components for DB queries, Server Actions for introspection + AI docs. Single deploy on Vercel. |
| UI Components | shadcn/ui | v0-native component library, dark mode tokens |
| Styling | Tailwind CSS v4 | v0 default, utility-first |
| Auth | better-auth | v0-native auth library. Email/password with session management, CSRF protection, and middleware. |
| Database | Amazon Aurora PostgreSQL | System catalog introspection + user data |
| ORM | Drizzle ORM | Lightweight, SQL-like query builder. No code generation step. v0-native (shipped with scaffold). |
| Visualization | React Flow (xyflow) | Interactive ERD diagrams, minimap, drag |
| AI | Hermes (via API) | Schema → natural language documentation |
| Deployment | Vercel | Single deploy, instant previews, ISR for share pages |
| Hosting | Vercel + AWS us-east-1 | Aurora in us-east-1 for lowest latency to Vercel edge |

## 3. Data Flow

### 3.0 Auth Flow

```
Register: Email + password → bcrypt hash → INSERT INTO users → better-auth session → redirect to /
Login: Email + password → bcrypt compare → better-auth session → redirect to /
Auth check: better-auth middleware checks session on /explore/* and /api/* (except /api/share/*)
Session: Stored in httpOnly cookie, read via server auth() helper in Server Components
```

### 3.1 Connect Flow

```
Authenticated user enters connection string → Server Action validates → introspection engine discovers schema
→ System catalog queries run → Schema object stored in Aurora (linked to user_id) → Redirect to Explorer
```

### 3.2 Explore Flow

```
Page loads schema from Aurora → React Flow renders ERD → User clicks table
→ Column details panel appears → Filter/search across tables
```

### 3.3 AI Documentation Flow

```
User clicks "Generate Docs" → Table schema sent to Hermes → LLM generates
per-table docs → Stored in Aurora → Displayed in docs panel
```

### 3.4 Share Flow

```
User clicks "Share" → Schema page rendered statically (ISR) → Public URL generated
→ No auth required for viewing
```

## 4. Database Schema

### 4.1 Aurora PostgreSQL (User Data)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,      -- bcrypt hashed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Saved schemas (the introspected schema, not credentials)
CREATE TABLE saved_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,           -- user-given name for this connection
    db_type TEXT NOT NULL,        -- 'aurora-postgresql'
    tables_json JSONB NOT NULL,   -- full schema: tables, columns, types, constraints
    ai_docs_json JSONB,           -- AI-generated per-table documentation
    share_id TEXT UNIQUE,         -- public share URL slug
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Introspection Queries (Read-Only)

```sql
-- List all user tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Get columns for a table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = $1;

-- Get foreign key relationships
SELECT
    tc.table_name, kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
```

## 5. Component Architecture

```
src/
├── app/
│   ├── page.tsx                    # Landing / Connect page
│   ├── layout.tsx                  # Root layout (ThemeProvider + Toaster + SessionProvider)
│   ├── login/page.tsx              # Login page
│   ├── register/page.tsx           # Register page
│   ├── explore/[schemaId]/
│   │   └── page.tsx                # ERD Explorer page (protected)
│   ├── share/[shareId]/
│   │   └── page.tsx                # Public share page (ISR)
│   └── api/
│       ├── auth/route.ts            # better-auth API handler (GET, POST)
│       ├── introspect/route.ts     # POST: introspect DB connection (protected)
│       ├── generate-docs/route.ts  # POST: generate AI docs (protected)
│       ├── schema/[id]/route.ts    # GET: schema data (protected)
│       ├── schemas/route.ts        # GET: list user's saved schemas
│       └── share/[shareId]/route.ts # GET: share page data (public)
├── components/
│   ├── ConnectForm.tsx             # Connection string input + validate
│   ├── ERDCanvas.tsx               # React Flow canvas wrapper
│   ├── TableNode.tsx               # Custom React Flow node (table card)
│   ├── ColumnPanel.tsx             # Side panel: column details
│   ├── DocsPanel.tsx               # AI-generated docs viewer
│   ├── ShareButton.tsx             # Generate share URL
│   ├── UserMenu.tsx                # Logged-in user dropdown (email, logout)
│   └── SchemaList.tsx              # "My Schemas" list on landing page
├── lib/
│   ├── db.ts                       # Drizzle client singleton
│   ├── auth.ts                     # better-auth server configuration
│   ├── introspection.ts           # System catalog query logic
│   ├── ai-docs.ts                 # Hermes API call for doc generation
│   └── schema-store.ts            # Aurora read/write for saved schemas
├── middleware.ts                    # better-auth middleware (protect /explore/*, /api/*)
└── types/
    └── schema.ts                   # TypeScript types: Table, Column, Relation
```

## 6. Component Mapping (shadcn/ui)

| Feature | shadcn/ui Components |
|---------|---------------------|
| Login / Register | Card, Input, Button, Label |
| User menu | DropdownMenu, Avatar fallback |
| Landing page | Card, Input, Button, Badge |
| Schema list ("My Schemas") | Card list with name, date, table count badges |
| Connection form | Card, Input (type=password), Button |
| ERD canvas | React Flow (npm: @xyflow/react) |
| Sidebar panels | Custom div with border, slide-in animation |
| Table node cards | Card with custom header/body/footer |
| Filter bar | Input with search icon prefix |
| AI docs panel | prose classes, Skeleton, Tabs |
| Share dialog | Dialog, Input (readonly), Button (copy) |
| Empty state | centered div with muted icon + text |

## 7. API Design

### POST /api/introspect
```json
// Request (requires auth session)
{ "connectionString": "postgresql://..." }

// Response
{ "schemaId": "uuid", "tables": [...], "relationCount": 12 }
```

### POST /api/generate-docs
```json
// Request (requires auth session)
{ "schemaId": "uuid", "tableName": "orders" }

// Response
{ "tableName": "orders", "docs": "# Orders\n\nThe orders table tracks..." }
```

### GET /api/schema/{id}
```json
// Response (requires auth session, owner only)
{ "id": "uuid", "name": "My App DB", "tables": [...], "aiDocs": {...} }
```

### GET /api/schemas
```json
// Response (requires auth session, user's schemas)
{
  "schemas": [
    { "id": "uuid", "name": "My App DB", "tableCount": 12, "createdAt": "..." },
    { "id": "uuid", "name": "Analytics DB", "tableCount": 8, "createdAt": "..." }
  ]
}
```

### GET /api/share/{shareId}
```json
// Response (public, no auth)
{ "id": "uuid", "name": "My App DB", "tables": [...], "aiDocs": {...} }
```

## 8. Security

- Connection strings passed via Vercel Environment Variables, never stored
- Aurora accessed via IAM role (OIDC integration — no static credentials)
- System catalog queries are READ-ONLY
- Share pages are public but read-only (no DB access)
- Connection string validated server-side, never exposed to client
- Rate limiting on introspection endpoint (prevent abuse)
- **Authentication**: better-auth with email/password
- Passwords hashed with bcrypt (12 salt rounds), never stored in plaintext
- JWT sessions in httpOnly cookies (not accessible to JavaScript)
- Protected API routes validate user session + schema ownership
- CSRF protection via better-auth built-in CSRF tokens

## 9. Demo Script (3 minutes)

```
[0:00-0:30]  Problem: "Every time I join a new project, I spend hours understanding
             the database. What tables exist? How do they relate? Where's the docs?"

[0:30-1:00]  Connect: Enter connection string → SchemaLens discovers 12 tables,
             45 columns, 8 relationships. ERD appears instantly.

[1:00-1:30]  Explore: Click through tables. See columns, types, constraints.
             Zoom into related tables. Filter by name.

[1:30-2:15]  AI Docs: Click "Generate Documentation" → Hermes writes per-table docs.
             "orders — tracks customer purchases. Links to users via user_id..."

[2:15-2:45]  Share: Generate public URL → open in incognito → full schema docs
             visible. Share with team, new hire, or stakeholder.

[2:45-3:00]  Wrap: "SchemaLens — understand your database in minutes, not hours.
             Built with Aurora PostgreSQL + Vercel + v0."
```

## 10. Performance Targets

| Metric | Target |
|--------|--------|
| Introspection latency | < 3 seconds for 50 tables |
| ERD render time | < 1 second for 50 nodes |
| AI doc generation | < 10 seconds per table |
| Share page load | < 500ms (ISR cached) |

## 11. Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Introspection engine | Vitest + test DB | Schema discovery, FK graph construction |
| API routes | Vitest + supertest | Endpoint responses, error cases |
| React components | Vitest + Testing Library | ConnectForm, ERDCanvas, ShareButton |
| E2E | Playwright (post-submission) | Full connect → explore → share flow |

> Hackathon MVP prioritizes working demo over test coverage. Core introspection and API routes tested. Full E2E deferred to post-submission.

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-06-20 | Switched ORM from Prisma to Drizzle (v0-native). Updated tech stack table, data flows, and component index. |
| 1.2 | 2026-06-20 | Switched auth from NextAuth v4 to better-auth (v0-native). Updated tech stack table, auth flow, component index, and security section. |
