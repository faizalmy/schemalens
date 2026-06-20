---
tags: [hackathon, decisions, schemalens, h0]
created: 2026-06-19
status: draft
version: 1.0
related:
  - "[[PRD]]"
  - "[[architecture]]"
---

# SchemaLens — Decision Log

> **Product requirements:** See [[PRD]] for features, market, and user workflows.
> **Technical design:** See [[architecture]] for system diagrams, data model, and API design.

## Decisions

| ID | Decision | Rationale | Rejected |
|----|----------|-----------|----------|
| D1 | Aurora PostgreSQL as primary DB | System catalog introspection (`information_schema`, `pg_catalog`) provides deep schema discovery. PostgreSQL is the standard relational DB — every developer knows it. | DynamoDB (no schemas to introspect — defeats the product's core value). Aurora DSQL (newer, fewer introspection features, smaller audience). |
| D2 | Track: Open Innovation | Creative freedom to build a developer tool without B2C/B2B/million-scale constraints. SchemaLens is universal — it helps solo devs and enterprise teams alike. | Track 2 B2B (narrower positioning, more entries). Track 4 has exactly the same prize structure and judging weight. |
| D3 | React Flow for ERD visualization | Purpose-built for interactive node-edge graphs. Built-in minimap, zoom, drag, auto-layout. MIT license. Battle-tested in tools like n8n, Directus. | D3.js (lower-level, 3x more code for same result). Mermaid.js (static, not interactive). |
| D4 | Drizzle ORM for DB access | v0 ships with drizzle-orm + pg pre-installed. SQL-like query builder with no code generation step — the schema is just TypeScript types. Lighter than Prisma for a hackathon (no binary, no schema file generation). Supports raw SQL via `db.execute()` for introspection queries. | Prisma (heavier, requires `prisma generate`, binary download). Raw `pg` (no type safety for user data queries). |
| D5 | Next.js + Vercel (v0 scaffold) | Hackathon requirement. v0 generates production-ready Next.js frontend. Server Components for DB queries without API layer overhead. | Nuxt, SvelteKit, Astro — all valid but Next.js is our strongest skill. |
| D6 | AI docs via LLM (Hermes) | Schema → natural language description is a perfect LLM use case. Column names + types + constraints → meaningful docs. Batch-generate per table. | Manual docs (defeats the product). External AI API (cost, latency). |
| D7 | Connection strings via environment variables, never stored in DB | Hackathon rule: credentials via Vercel Environment Variables. SchemaLens connects, introspects, stores the schema (not credentials). User re-enters to refresh. | Stored connection strings (security risk, hackathon rules prohibit). OIDC (overengineered for demo). |
| D8 | Shareable schema pages as static renders | Generated schema docs are static pages. No auth needed for viewing. Public URL = instant sharing with team. | Real-time connection (complexity not justified for demo). Auth-gated sharing (friction for judges). |
| D9 | Name: SchemaLens | Short, professional. "Lens" implies insight/viewing. Not taken by a direct competitor (myschemapilot.com is an SEO schema tool — different domain). | SchemaPilot (taken), DBMapper (generic), SchemaViz (too clinical), TableGraph (too narrow). |
| D10 | better-auth for auth | v0 ships with better-auth pre-installed. Full-featured auth library with email/password, session management, CSRF protection, and middleware support. Lightweight — no external services needed for MVP. | NextAuth v4 (heavier, not v0-native). NextAuth v5/Auth.js (beta, breaking changes risk). Lucia (deprecated). Clerk/Auth0 (external dependency, overkill for hackathon). |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-06-20 | Updated D4: Drizzle ORM replaces Prisma. New rationale aligns with v0 scaffold. |
| 1.2 | 2026-06-20 | Updated D10: better-auth (v0-native) replaces NextAuth v4. Rationale and rejected alternatives updated. |
