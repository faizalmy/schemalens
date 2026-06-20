---
tags: [hackathon, prd, schemalens, h0, developer-tools]
created: 2026-06-19
status: draft
version: 1.0
related:
  - "[[architecture]]"
  - "[[decisions]]"
---

# SchemaLens — Product Requirements Document

> **Technical design:** See [[architecture]] for system diagrams, data model, and API design.
> **Decision rationale:** See [[decisions]] for why we made these choices.

## 1. Executive Summary

SchemaLens is an interactive database schema explorer. Connect your AWS Aurora PostgreSQL database and get an instant, interactive entity-relationship diagram with AI-generated documentation. No setup, no CLI, no diagramming tool — just a connection string and you're done.

Built for the **H0: Hack the Zero Stack** hackathon (Track 4: Open Innovation) using the required stack: Aurora PostgreSQL + Vercel/v0.

## 2. Problem

**Every developer has been here:** You join a project, open the database, and see 30+ tables with cryptic names. No documentation. No ERD. Hours wasted tracing foreign keys and guessing what each column means.

Current solutions all suck:
- **pgAdmin/DBeaver**: Heavy desktop apps, no sharing, no docs
- **dbdiagram.io/draw.io**: Manual drawing — manually update every time schema changes
- **SchemaSpy**: CLI tool, ugly output, Java dependency
- **We found no tool that does all four:** auto-discover + visualize + document + share

## 3. Solution

SchemaLens connects to your Aurora PostgreSQL database, introspects the system catalog, renders an interactive ERD, and generates per-table documentation via AI — all in the browser. Share a public URL with your team in one click.

**Core value proposition:** Understand any PostgreSQL database in minutes, not hours.

## 4. Target Users

| Persona | Use Case | Pain Point |
|---------|----------|------------|
| New hire / onboarding dev | Understand an unfamiliar codebase's DB | "30 tables, zero docs, where do I start?" |
| Tech lead / architect | Review schema design, document for team | "I know the schema but documenting it is tedious" |
| Freelancer / consultant | Quickly understand client's existing DB | "Client can't even tell me what tables they have" |
| Startup CTO | Document MVP database before it gets out of hand | "We'll document it later" (never happens) |

## 5. Features (MVP)

### 5.1 User Authentication (P1)
- Email + password registration
- Login with session persistence (better-auth, httpOnly cookie)
- Protected routes: connect, explore (owner-only)
- Public routes: landing, share pages (no auth)
- Header shows logged-in user email + logout
- See [[decisions]]#D10 for auth rationale

### 5.2 Connect Database (P0)
- Paste PostgreSQL connection string
- Validate connection (server-side only)
- Introspect system catalog: tables, columns, types, constraints, foreign keys
- Store schema snapshot in Aurora (credentials NEVER stored)
- See [[decisions]]#D7 for security rationale

### 5.3 Interactive ERD Explorer (P0)
- React Flow canvas with auto-layout tables as nodes
- Foreign keys rendered as edges between tables
- Click table → expand to show columns with types
- Zoom, pan, minimap
- Filter/search by table name
- See [[decisions]]#D3 for React Flow rationale

### 5.4 Column Details Panel (P1)
- Click column → see: name, type, nullable, default, constraints
- Foreign key → link to referenced table
- Index information where available

### 5.5 AI Documentation Generator (P0)
- Click "Generate Docs" → Hermes generates per-table documentation
- Column names + types + foreign keys → natural language description
- Example output: "The `orders` table tracks customer purchases. Links to `users` via `user_id`. Status field tracks order lifecycle: pending → confirmed → shipped → delivered."
- Stored in Aurora, displayed alongside ERD
- See [[decisions]]#D6 for AI approach

### 5.6 Shareable Schema Page (P1)
- Generate public URL for any saved schema (ISR-rendered)
- Full ERD + AI docs visible without auth
- Copy link to share with team, new hire, or stakeholder
- Schemas are associated with the authenticated user who created them
- See [[decisions]]#D8 for share design

### 5.7 Schema History (P2 — stretch)
- Re-introspect to see what changed
- Diff view: added/removed tables and columns
- Not required for MVP demo but nice-to-have

## 6. Feature Exclusions (NOT in MVP)

- Write access to databases (read-only, safe)
- Multiple database types (PostgreSQL only for hackathon)
- Team accounts / collaboration
- Real-time schema monitoring
- Export to SQL/migration files
- Self-hosted version

## 7. Market Validation

### 7.1 Demand Signals

- "database schema visualization tool" — 4,400 monthly searches (Google Keyword Planner, 2025)
- "postgresql erd tool" — 2,900 monthly searches
- "database documentation tool" — 1,900 monthly searches
- dbdiagram.io: 200K+ registered users, $12-49/mo pricing (indicates willingness to pay)
- DrawSQL: acquired by Planetscale in 2023 (exit validates market)

### 7.2 Competitor Landscape

| Tool | Price | Auto-Discover | Interactive ERD | AI Docs | Share | Web-Based |
|------|-------|---------------|-----------------|---------|-------|-----------|
| dbdiagram.io | $12-49/mo | No (DSL) | No (static) | No | Yes | Yes |
| DrawSQL | $19-79/mo | No (import) | Limited | No | Yes | Yes |
| SchemaSpy | Free | Yes | No (static HTML) | No | No | No (CLI) |
| DBeaver | Free | Yes | Yes (desktop) | No | No | No (native) |
| pgAdmin | Free | Yes | No | No | No | No (native) |
| **SchemaLens** | **Free (hackathon)** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |

**Positioning gap:** No web-based tool does all three: auto-discover + interactive ERD + AI docs. SchemaLens fills this gap.

## 8. Competition in Hackathon Context

### 8.1 Why This Stands Out

Among 6,387 participants, the median entry will be:
- AI chatbot + basic CRUD
- Stripe payment dashboard
- E-commerce store
- v0-scaffolded landing page with DynamoDB

SchemaLens is different:
- **Genuinely technical** — system catalog introspection, foreign key graphs, schema diffing
- **Visually impressive** — interactive ERD looks great in a 3-minute demo
- **Actually useful** — solves a real problem every developer has
- **Demonstrates the stack** — Aurora PostgreSQL's introspection capabilities + Vercel's ISR for share pages

### 8.2 Judges Will See

1. A tool that works with THEIR database (not a demo dataset)
2. Real-time ERD generation from system catalogs
3. AI-generated documentation that's actually useful
4. Instant sharing — the "wow" moment

## 9. Build Plan (11 Days)

| Day | Date | Focus | Deliverables |
|-----|------|-------|-------------|
| 1 | Jun 19 | Scaffold, Aurora setup, Auth | Next.js project on Vercel, Aurora provisioned, Drizzle schema + migration (users + saved_schemas), better-auth setup (email/password), register/login pages, middleware |
| 2 | Jun 20 | Connect flow | Connection form, validation, introspection engine, schema association with user |
| 3 | Jun 21 | Introspection engine | System catalog queries, schema JSON generation |
| 4 | Jun 22 | ERD canvas | React Flow integration, auto-layout, table nodes |
| 5 | Jun 23 | Column details | Side panel, click-to-expand, foreign key edges, indexes |
| 6 | Jun 24 | AI docs | Hermes integration, per-table doc generation, display |
| 7 | Jun 25 | Share pages | ISR static rendering, public URLs |
| 8 | Jun 26 | Polish UX | Loading states, empty states, error handling, responsive, "My Schemas" list |
| 9 | Jun 27 | Demo video | Script, record, edit (3 min) |
| 10 | Jun 28 | Submission prep | Architecture diagram, screenshots, text description, README |
| 11 | Jun 29 | Buffer + submit | Final testing, polish, submit before 5pm PDT |

## 10. Submission Checklist

- [ ] Vercel signup + v0 account
- [ ] Request AWS + v0 credits by June 26 (form: https://forms.gle/ozhbhvaXAxHxu3kMA)
- [ ] Aurora PostgreSQL provisioned (us-east-1)
- [ ] Next.js app deployed to Vercel
- [ ] Demo video (3 min, YouTube): problem → connect → explore → AI docs → share
- [ ] Published Vercel Project Link + Vercel Team ID
- [ ] Architecture diagram (draw.io with AWS icons)
- [ ] Storage Configuration screenshot (Aurora instance in AWS Console)
- [ ] Text description: "SchemaLens uses Amazon Aurora PostgreSQL for system catalog introspection and user data storage. Frontend deployed on Vercel via Next.js with v0-scaffolded components."
- [ ] Bonus: Blog post / social post with #H0Hackathon

## 11. Judging Criteria Alignment

| Criterion (25% each) | How SchemaLens Addresses It |
|----------------------|---------------------------|
| **Technological Implementation** | Deep system catalog introspection — not just a CRUD wrapper. Foreign key graph construction, React Flow interactive visualization, ISR for share pages. Deliberate Drizzle ORM + Aurora architecture. |
| **Design** | shadcn/ui design system with dark mode = consistent, professional UX. Interactive ERD is intuitive (zoom/pan/click). Empty states, loading skeletons, error handling — feels like a product, not a demo. |
| **Impact & Real-world Applicability** | Every developer team with a database needs schema documentation. Solves real pain (4,400+ monthly searches). Scalable Aurora foundation = production-ready from day one. |
| **Originality** | A web-based tool combining auto-discovery + interactive ERD + AI docs + instant sharing. Existing competitors do 1-2 of these; we found none that do all four in the browser. |

## 12. Post-Hackathon Path

SchemaLens is designed to be a real product, not just a hackathon demo:

**Monetization (v2):**
- Free tier: 5 schemas, public share only
- Pro ($15/mo): Unlimited schemas, private share, schema diff, export to SQL
- Team ($49/mo): Team schemas, RBAC, Slack integration

**Revenue potential:** If dbdiagram.io has 200K users at $12-49/mo, a tool that auto-discovers + documents schemas captures the untapped "auto" segment of the same market.

## 13. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Raw `information_schema` queries may be slow on large schemas | Low (for demo DBs) | Limit to first 50 tables, show progress |
| Aurora setup takes time | Medium | Provision Day 1, use default VPC |
| React Flow performance with 100+ tables | Medium | Virtualize nodes, paginate large schemas |
| Connection string security concerns | Low | See [[decisions]]#D7 — never stored |
| 6,387 competitors | High | Stand out with genuine technical depth + visual polish |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-06-20 | Switched ORM from Prisma to Drizzle (v0-native). Updated build plan, tech details, and risks accordingly. |
| 1.2 | 2026-06-20 | Switched auth from NextAuth v4 to better-auth (v0-native). Updated feature descriptions and build plan. |
