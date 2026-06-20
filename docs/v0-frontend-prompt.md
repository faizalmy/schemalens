---
tags: [hackathon, schemalens, h0, frontend, v0, prompt]
created: 2026-06-19
status: draft
version: 3.0
related:
  - "[[PRD]]"
  - "[[architecture]]"
  - "[[decisions]]"
---

# SchemaLens — v0 Frontend Prompt

> Feed each page section to v0 in sequence. Every section is self-contained.

---

## Global Rules (every page)

- Next.js 16 App Router, Tailwind CSS v4, React 19, TypeScript
- shadcn/ui components: Card, Input, Button, Badge, Table, Dialog, Tabs, Separator, Skeleton, DropdownMenu, Avatar, Label
- Geist font (next/font/google)
- Dark mode via next-themes (attribute="class", defaultTheme="dark")
- Toast notifications via sonner (bottom-right, richColors)
- Auth: better-auth with email/password. AuthProvider wraps the app (layout.tsx). useSession() hook or authClient for client components, auth() server helper for server. Protected routes redirect to /login.
- Every data view: loading (skeleton) → empty (illustration) → error (toast + retry) → success
- Responsive: mobile stacked, desktop multi-column

**Backend (brief):** Next.js API routes handle DB connection, introspection, AI doc generation, and schema storage. better-auth handles register/login with bcrypt-hashed passwords in Aurora. Connection strings never stored in browser.

---

## Page 1: Landing + Connect

Route: `src/app/page.tsx`

This is an auth-aware page — it shows different content for logged-out vs logged-in users.

### When NOT Logged In

```
┌──────────────────────────────────────────────┐
│  SchemaLens              [Sign Up] [Log In]  │  ← header
├──────────────────────────────────────────────┤
│                                              │
│     Understand your database                 │  ← hero
│     in minutes, not hours.                   │    text-4xl, font-bold
│                                              │
│     Connect your Aurora PostgreSQL           │  ← subtext
│     database and get an interactive           │    text-lg, text-muted-foreground
│     ERD with AI-generated docs.              │    max-w-2xl, mx-auto
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Create a free account to get        │    │  ← Card, max-w-lg, mx-auto
│  │  started.                            │    │    rounded-xl, shadow-sm, border
│  │                                      │    │    text-center, p-6
│  │  [ Sign Up with Email ]              │    │  ← Button, primary, full-width
│  │                                      │    │
│  │  Already have an account? Log in →   │    │  ← text-sm, text-muted-foreground
│  └──────────────────────────────────────┘    │    link to /login
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────┐ │
│  │   ①    │  │   ②    │  │   ③    │  │ ④  │ │  ← "How It Works" grid
│  │Connect │  │Explore │  │Document│  │Share│ │    2x2 desktop, 2x1 mobile
│  │ Paste  │  │ Inter- │  │   AI   │  │One- │ │    circled number + title
│  │ your   │  │ active │  │generates│  │click│ │    + one-line description
│  │string  │  │  ERD   │  │  docs  │  │ URL │ │
│  └────────┘  └────────┘  └────────┘  └────┘ │
│                                              │
│     Built for H0 Hackathon                   │  ← footer, text-sm, muted
│     Aurora PostgreSQL + Vercel + v0          │
└──────────────────────────────────────────────┘
```

### When Logged In

```
┌──────────────────────────────────────────────┐
│  SchemaLens            [user@email.com ▼]    │  ← header
├──────────────────────────────────────────────┤
│                                              │
│     Your Schemas                             │  ← text-2xl, font-semibold
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  My App DB               12 tbl [⋯] │    │  ← Schema card (Card, hover:bg-muted/50)
│  │  Connected Jun 19, 2026        →     │    │    click → /explore/{id}
│  └──────────────────────────────────────┘    │    [⋯] opens menu: Rename / Delete
│                                              │        Delete shows confirm dialog:
│  ┌──────────────────────────────────────┐    │         "Delete 'My App DB'?"
│  │  Analytics DB               8 tbl [⋯]│    │         "This removes the saved schema
│  │  Connected Jun 20, 2026        →     │    │          and its AI docs. This cannot
│  └──────────────────────────────────────┘    │          be undone."
│                                              │         [Cancel] [Delete] (red)
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  + Connect New Database              │    │  ← Dashed border card
│  └──────────────────────────────────────┘    │    click → expands form below
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Schema Name                         │    │  ← Connect form (expands on click)
│  │  ┌──────────────────────────────────┐│    │
│  │  │ My App Database                  ││    │  ← user-given name
│  │  └──────────────────────────────────┘│    │
│  │                                      │    │
│  │  Connection String              (?)  │    │  ← (?) tooltip: "Find this in your
│  │  ┌──────────────────────────────────┐│    │    AWS RDS Console → Connectivity
│  │  │ postgresql://user:pw@host:5432/  ││    │    & Security. Format: postgresql://
│  │  │ dbname                          ││    │    user:password@host:port/database"
│  │  └──────────────────────────────────┘│    │
│  │  🔒 Your credentials are never       │    │
│  │     stored.                          │    │
│  │  [ Connect Database ]                │    │
│  └──────────────────────────────────────┘    │
│                                              │
│     Built for H0 Hackathon                   │  ← footer
│     Aurora PostgreSQL + Vercel + v0          │
└──────────────────────────────────────────────┘
```

### States

| State | Visual |
|-------|--------|
| Logged out, default | Hero + signup card + steps + footer |
| Logged in, loading | 3-4 pulsing schema card skeletons (bg-muted, animate-pulse, rounded-lg, h-20) |
| Logged in, no schemas | "No schemas yet." (text-muted-foreground, centered) + "Connect New Database" card below |
| Logged in, has schemas | Schema cards list + "Connect New Database" card |
| Connecting | Form input disabled. Button: Spinner icon + "Connecting..." (animate-spin). |
| Connect error | Input border turns red. Red alert below form: "Connection failed. Check your connection string and ensure your database is accessible from the internet." Icon: XCircle. |
| Connect success | Brief flash of checkmark on button, then immediate redirect to `/explore/{schemaId}` |
| User menu clicked | DropdownMenu: email (muted), "My Schemas" (link to /), separator, "Log Out" (red, calls signOut()) |
| Schema card kebab [⋯] | DropdownMenu: "Rename" (inline edit), "Delete" (red). Delete opens confirm Dialog with destructive action. |
| Deleting schema | Button: Spinner + "Deleting...". Card fades out on success (animate-out, fade-out, duration-200). Toast: "Schema deleted." on success. |

Backend: GET `/api/schemas` returns user's saved schemas. Form submits to POST `/api/introspect`. On success returns `schemaId`. Redirect to `/explore/{schemaId}`.

---

## Page 2: Login

Route: `src/app/login/page.tsx`

Centered card, max-w-md, mx-auto, my-20:

```
┌──────────────────────────────────────────────┐
│  SchemaLens                                  │  ← logo, links to /
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Welcome back                        │    │  ← Card, max-w-sm, mx-auto
│  │                                      │    │
│  │  Email                               │    │  ← Label + Input
│  │  ┌──────────────────────────────────┐│    │
│  │  │ user@example.com                 ││    │
│  │  └──────────────────────────────────┘│    │
│  │                                      │    │
│  │  Password                       👁    │    │  ← Label + Input (type=password)
│  │  ┌──────────────────────────────────┐│    │    👁 toggles type between
│  │  │ ●●●●●●●●                        ││    │    password and text
│  │  └──────────────────────────────────┘│    │
│  │                                      │    │
│  │  [ Log In ]                          │    │  ← Button, primary, full-width
│  │                                      │    │
│  │  Don't have an account? Sign up →    │    │  ← text-sm, muted, link to /register
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

### States

| State | Visual |
|-------|--------|
| Default | Form with email + password fields |
| Submitting | Button: Spinner + "Logging in..." (disabled). Both inputs disabled. |
| Error | Red alert above form: "Invalid email or password." (persistent, user must read). Input borders turn red briefly. |
| Success | Redirect to `/` (landing page, now showing "Your Schemas") |

Backend: better-auth authClient.signIn.email() handles login. On success, session cookie set automatically.

---

## Page 3: Register

Route: `src/app/register/page.tsx`

Same layout as login, different copy:

```
┌──────────────────────────────────────────────┐
│  SchemaLens                                  │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Create your account                 │    │
│  │                                      │    │
│  │  Email                               │    │
│  │  ┌──────────────────────────────────┐│    │
│  │  │ user@example.com                 ││    │
│  │  └──────────────────────────────────┘│    │
│  │                                      │    │
│  │  Password                       👁    │    │  ← Label + Input (type=password)
│  │  ┌──────────────────────────────────┐│    │    👁 toggles visibility
│  │  │ ●●●●●●●●                        ││    │
│  │  └──────────────────────────────────┘│    │    min 8 characters
│  │                                      │    │
│  │  Confirm Password               👁    │    │  ← Label + Input (type=password)
│  │  ┌──────────────────────────────────┐│    │    👁 toggles visibility
│  │  │ ●●●●●●●●                        ││    │
│  │  └──────────────────────────────────┘│    │
│  │                                      │    │
│  │  [ Create Account ]                  │    │  ← Button, primary, full-width
│  │                                      │    │
│  │  Already have an account? Log in →   │    │  ← text-sm, muted, link to /login
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

### States

| State | Visual |
|-------|--------|
| Default | Form with email + password + confirm fields |
| Password mismatch | "Confirm Password" input border turns red + "Passwords do not match" text below (text-sm, text-red-500) |
| Submitting | Button: Spinner + "Creating account..." (disabled). All inputs disabled. |
| Error | Red alert above form: "An account with this email already exists." or "Password must be at least 8 characters." |
| Success | Redirect to `/` (landing page, auto-logged in, showing "Your Schemas" with empty state) |

Backend: POST to better-auth signUp.email() flow. Registration creates user in Aurora with bcrypt-hashed password, then auto-authenticates and redirects.

---

## Page 4: ERD Explorer

Route: `src/app/explore/[schemaId]/page.tsx`

This is the core app. User sees their database as an interactive diagram.

### Full Layout

```
┌──────────────────────────────────────────────────────────┐
│ SchemaLens │ My App DB     12 tables  45 cols  8 rels   [Share] [user@email ▼] │ ← top bar
├────────────┬────────────────────────────────────────────┤
│ LEFT       │                                            │
│ SIDEBAR    │         INTERACTIVE ERD CANVAS             │
│ w-80       │                                            │
│            │    ┌──────────┐      ┌──────────┐         │
│ ┌────────┐ │    │  users   │─────>│  orders  │         │
│ │🔍Filter│ │    │  5 cols  │      │  6 cols  │         │
│ └────────┘ │    └──────────┘      └────┬─────┘         │
│            │                           │                │
│  users    │    ┌──────────┐      ┌────┴─────┐         │
│  orders   │    │  items   │<─────│ products  │         │
│  products │    │  4 cols  │      │  7 cols   │         │
│  payments │    └──────────┘      └───────────┘         │
│  ...      │                                            │
│            │               [minimap]     [+ − ⊞]       │
│ 12 tables │                                            │
├────────────┴────────────────────────────────────────────┤
│ RIGHT PANEL (slides in when table clicked, w-96)        │
│ ┌──────────────────────────────────────────────────────┐│
│ │ [✕]  orders                                           ││
│ │                                                      ││
│ │ [Columns]  [AI Docs]          ← tab bar              ││
│ │ ──────────────────────────────────────────────────── ││
│ │ ┌──────────┬──────────┬──────┬───────────────────┐  ││
│ │ │ Column   │ Type     │ Null │ Default           │  ││
│ │ │ id       │ uuid     │  NO  │ gen_random_uuid() │  ││
│ │ │ user_id  │ uuid     │  NO  │ —                 │  ││
│ │ │ total    │ numeric  │  NO  │ 0                 │  ││
│ │ │ status   │ text     │  NO  │ 'pending'         │  ││
│ │ └──────────┴──────────┴──────┴───────────────────┘  ││
│ │                                                      ││
│ │ Foreign Keys                                         ││
│ │   user_id → users.id                        ← links  ││
│ │   product_id → products.id                           ││
│ │                                                      ││
│ │ Indexes                                              ││
│ │   orders_pkey (id)                          ← primary││
│ │   idx_orders_user_id (user_id)              ← btree  ││
│ │                                                      ││
│ │ [✨ Generate AI Documentation]              ← button  ││
│ └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Component Details

**Top Bar** (sticky, border-b, bg-background, z-10, h-14):
- Left: "← My Schemas" link (text-sm, text-muted-foreground, hover:text-foreground, links to `/`) + "·" separator (text-muted-foreground/30, mx-2) + "SchemaLens" text logo (font-semibold, tracking-tight)
- Center: schema name (font-medium) + badge row: "12 tables", "45 columns", "8 relations" (Badge, variant=secondary, text-xs)
- Right: Share button (variant=outline, share icon, text-sm) + User menu (DropdownMenu: shows user email + "My Schemas" link + "Log Out" (red, calls signOut()))

**Left Sidebar** (w-80, border-r, h-full, overflow-y-auto, bg-card):
- Search input at top (sticky): placeholder "Filter tables...", search icon prefix. Filters table list as user types (instant, no debounce needed).
- Table list (scrollable): each item = sparkle icon if AI docs exist (text-yellow-500, w-4, h-4, flex-shrink-0) + table name (font-medium, truncate) + column count badge (text-xs, text-muted-foreground). No sparkle = docs not generated yet. Selected item: bg-accent, ring-1 ring-primary. Hover: bg-muted.
- Stats footer (sticky bottom, border-t): summary row — "12 tables · 45 columns · 8 relations · 3 documented" (text-xs, text-muted-foreground)

**ERD Canvas** (flex-1, bg-background with dot grid):

Custom node — TableNode (220x140px approx):
```
┌──────────────────────┐
│ users          [5]   │  ← header: table name + column count badge
├──────────────────────┤     bg-secondary, px-3, py-2, rounded-t-lg
│ id         uuid      │  ← column row: name (font-medium) + type (muted)
│ email      text      │     px-3, py-1.5, text-sm
│ created_at timestamp │
│                       │  ← show max 3 columns
│ +2 more...            │  ← footer if >3: "+N more columns", text-xs
└──────────────────────┘     italic, text-muted-foreground, border-t
```
- Selected: ring-2, ring-primary, shadow-md
- Default: shadow-sm, border
- Drag: reposition node freely
- React Flow smoothstep edges for foreign keys. Color: muted-foreground. No arrows needed.
- Background: dot grid (small dots, bg-dot pattern)
- Minimap (bottom-right corner, small, rounded border, always visible)
- Controls (top-right): + zoom in, - zoom out, ⊞ fit view. Small icon buttons, border, rounded-lg.
- Auto-layout: nodes arranged top-to-bottom with dagre on first load. 100px horizontal gap, 80px vertical.

**Right Panel** (w-96, border-l, h-full, bg-card, overflow-y-auto):
- Slides in from right (animate-in, slide-in-from-right, duration-200).
- Header: table name (text-lg, font-semibold) + close button (✕, top-right, variant=ghost, size=icon)
- Tab bar: "Columns" | "AI Docs" (Tabs component, full width)
- Columns tab: shadcn Table with columns — Column (click to copy to clipboard, cursor-pointer, hover:underline, copy icon appears on hover), Type, Null (green "NO" badge / gray "YES" badge), Default. Indexes section below (text-sm, text-muted-foreground): primary key index + any btree/unique indexes with column names. FK section below with link references (text-sm, text-primary, hover:underline).
- AI Docs tab: if no docs yet, empty state ("No documentation yet" + generate button). While generating: Skeleton (3-4 pulsing lines + paragraph blocks). When loaded: rendered markdown with prose styling (prose, prose-sm, dark:prose-invert). Typography: h2 bold, paragraphs with leading-relaxed, inline code with bg-muted rounded. After generation: show "Last generated: just now" timestamp (text-xs, text-muted-foreground) above the markdown.
- "Generate AI Documentation" button (bottom of columns tab, full-width, variant=secondary, sparkle icon). While loading: disabled, spinner, "Generating...". After generation: button text changes to "Regenerate Documentation" (variant=ghost, sparkle icon remains). Timestamp updates on re-generation.

### States Matrix

| State | What User Sees |
|-------|---------------|
| Loading (first visit) | Canvas: 6-8 pulsing card placeholders (bg-muted, animate-pulse, rounded-lg, same size as real nodes). Sidebar: 6 pulsing list rows. Top bar: schema name skeleton, stats skeleton badges. |
| Empty (zero tables) | Canvas: centered empty state — database icon (h-16, w-16, text-muted-foreground/30), "No tables found" (text-lg, font-medium), "This schema appears to be empty. Try connecting to a different database." (text-sm, text-muted-foreground). Sidebar shows 0 tables. |
| No relations (tables exist, zero FKs) | Canvas: all tables visible, auto-laid-out grid. Info banner in sidebar (below search): "No foreign key relationships detected. Tables are displayed without connections." (amber border-l-2, bg-amber/5, p-3, text-sm). |
| Error | Toast pops bottom-right: red, XCircle icon, "Failed to load schema", "Retry" button. Canvas stays in previous state (stale OK). |
| Loaded | Canvas populated. Sidebar populated. Panel closed. |
| Table selected | Canvas: node gets ring-2 ring-primary. Panel slides in from right. Columns tab active. Smooth scroll panel to top. |
| Column hover | Row highlights subtly (bg-muted/50) |
| Generating docs | Button: disabled, spinner, "Generating documentation..." text. AI Docs tab auto-opens, showing skeleton (3-4 pulsing lines). If generation takes >10s, show toast: "Still working... large schemas take longer." |
| Docs loaded | Skeleton replaced by rendered markdown. Button changes to "Regenerate Documentation" (variant=ghost). Toast: green checkmark, "Documentation generated for orders." "Last generated: just now" timestamp appears above markdown. |
| Docs error | Button re-enabled. Toast: red, "Failed to generate documentation. Try again." |
| Share clicked | Dialog opens (centered modal, overlay). Title: "Share Schema". Readonly input with full URL pre-selected. Copy button (copies to clipboard, shows "Copied!" toast). Description: "Anyone with this link can view your schema. No account needed." |
| Filter active | Sidebar list instantly filters to matching tables. Canvas unaffected (all nodes stay visible, could scroll-to-match as enhancement). "No tables match your search" if zero results. |
| 50+ tables | Canvas starts zoomed out (fit view by default). Users zoom in. Minimap useful here. |
| Schema not found | Redirect to 404 page. |

Backend: GET `/api/schema/{schemaId}` returns tables, columns, FKs, indexes, and any existing AI docs. Requires auth session. POST `/api/generate-docs` generates per-table docs. Share URL created server-side. GET `/api/schemas` lists user's saved schemas.

---

## Page 5: Public Share Page

Route: `src/app/share/[shareId]/page.tsx`

Public page. No login. Anyone with the link sees a read-only version of the schema.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ SchemaLens │ My App DB     12 tables  45 cols  8 rels     │ ← banner
├──────────────────────────────────────────────────────────┤
│                                                          │
│              READ-ONLY ERD CANVAS                        │
│                                                          │
│    ┌──────────┐      ┌──────────┐                       │
│    │  users   │─────>│  orders  │                       │
│    └──────────┘      └────┬─────┘                       │
│                           │                              │
│    ┌──────────┐      ┌────┴─────┐                       │
│    │  items   │<─────│ products  │                       │
│    └──────────┘      └───────────┘                       │
│                                                          │
│               [minimap]            [+ − ⊞]               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ [Tables]  [AI Documentation]                ← tabs       │
│ ┌──────────┬───────────────────────────────────────────┐│
│ │ Table    │ Selected: users                            ││
│ │ List     │ ┌──────────┬────────┬──────┬─────────────┐││
│ │          │ │ Column   │ Type   │ Null │ Default     │││
│ │  users ◀ │ │ id       │ uuid   │  NO  │ gen_random_ │││
│ │  orders  │ │          │        │      │  uuid()     │││
│ │  products│ │ email    │ text   │  NO  │ —           │││
│ │  items   │ │ created_ │ timest │  NO  │ now()       │││
│ │          │ │ at       │ amptz  │      │             │││
│ │          │ └──────────┴────────┴──────┴─────────────┘││
│ │          │  Indexes                                  ││
│ │          │  users_pkey (id) — PRIMARY                ││
│ │          │  idx_users_email (email) — UNIQUE         ││
│ └──────────┴───────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│ Built with SchemaLens · Aurora PostgreSQL + Vercel        │ ← footer
└──────────────────────────────────────────────────────────┘
```

### Key differences from Explorer

- **No top bar with share button** — replaced by simple banner (logo + schema name + stats)
- **Canvas is read-only** — zoom/pan only. Cannot drag nodes. Cannot select tables on canvas. No ring highlight on click.
- **Panel is fixed bottom** (h-1/3, border-t), not slide-in. Left side: scrollable table list. Right side: columns/details for selected table. Tabs switch between table columns + AI docs.
- **Table list in bottom panel** — clicking a table name updates the right side with its columns and indexes. Selected table gets ◀ indicator.
- **No "Generate Docs" button** — docs are pre-generated and read-only.
- **Footer** with attribution: "Built with SchemaLens · Aurora PostgreSQL + Vercel" (text-xs, text-muted-foreground, centered, py-3, border-t)
- **ISR cached** — `export const revalidate = 3600`

### States

| State | Visual |
|-------|--------|
| Loading | Full page skeleton: canvas area (bg-muted, animate-pulse, h-2/3), bottom panel (pulsing table rows, h-1/3) |
| Not found | Centered card: "Share link not found" (text-2xl, font-bold), "This schema share link doesn't exist or has been removed." (text-muted-foreground), "Go Home" button |
| Loaded | Canvas (h-2/3) + bottom tabs (h-1/3). Click table names in "Tables" tab to view columns. |
| Zero tables | Empty state in canvas area: "This schema has no tables." |

Backend: GET `/api/share/{shareId}` returns same schema data as explorer, no auth required.

---

## Page 6: 404 Not Found

Route: `src/app/not-found.tsx`

Centered card, max-w-md, mx-auto, my-20:
- Icon: FileQuestion or similar (h-12, w-12, text-muted-foreground/40)
- Heading: "Page not found" (text-2xl, font-bold, mt-4)
- Text: "The page you're looking for doesn't exist or has been moved." (text-muted-foreground, mt-2)
- Button: "Go Home" (variant=outline, mt-6) → links to `/`

---

## Page 7: Root Layout

Route: `src/app/layout.tsx`

```html
<html lang="en" class="dark" suppressHydrationWarning>
  <body class="font-sans antialiased bg-background text-foreground">
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </SessionProvider>
  </body>
</html>
```

No global sidebar. No global header (each page has its own top bar/banner as needed).

---

## 8. React Flow Setup Notes

- Package: `reactflow` (from `@xyflow/react`)
- Import ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState
- Node types: { tableNode: TableNodeComponent }
- TableNodeComponent: receives `data: { table: TableSchema, isSelected: boolean }`
- Edge: `{ id, source: tableName, target: referencesTable, type: 'smoothstep' }`
- dagre layout: `npm install dagre @types/dagre`, run once when data loads to compute positions
- Canvas takes full available height: `className="h-full w-full"` on parent container

---

## 9. v0 Generation Sequence

Paste each into v0 in order:

**Step 1: Root Layout**
```
Next.js 16 App Router layout. Geist font from next/font/google. AuthProvider from better-auth/client/react wrapping the app. ThemeProvider (next-themes, attribute="class", defaultTheme="dark", enableSystem). Toaster (sonner, bottom-right, richColors). No global header or sidebar. HTML lang="en" with suppressHydrationWarning. Dark background, light text.
```

**Step 2: Login Page**
```
src/app/login/page.tsx — centered card (max-w-sm). "SchemaLens" logo links to /. "Welcome back" heading. Email input (Label + Input). Password input (type=password). "Log In" full-width primary button. "Don't have an account? Sign up →" link to /register. States: submitting (spinner + "Logging in..." + disabled inputs), error (red alert "Invalid email or password." above form). Uses better-auth authClient.signIn.email(). Redirects to / on success. Use shadcn/ui Card, Input, Button, Label.
```

**Step 3: Register Page**
```
src/app/register/page.tsx — same centered card layout as login. "Create your account" heading. Email input. Password input (min 8 chars). Confirm password input. "Create Account" full-width primary button. "Already have an account? Log in →" link. States: password mismatch (red border + "Passwords do not match" text), submitting (spinner + "Creating account..." + disabled inputs), error (red alert for duplicate email or password too short). Uses better-auth authClient.signUp.email(). Redirects to / on success.
```

**Step 4: Landing Page (auth-aware)**
```
src/app/page.tsx — SchemaLens landing. Auth-aware via useSession(). Header: "SchemaLens" logo. When logged out: [Sign Up] and [Log In] buttons (outline, text-sm). When logged in: user email with DropdownMenu (email display, "My Schemas" link, separator, "Log Out" red). When logged out: Hero "Understand your database in minutes, not hours." (text-4xl, font-bold) + subtext. Card: "Create a free account to get started." + "Sign Up with Email" button + "Already have an account? Log in →" link. "How It Works" 4-step grid. When logged in: "Your Schemas" heading + list of schema cards (name, table count badge, date, arrow, kebab [⋯] menu: Rename/Delete with confirm dialog, click → /explore/{id}). Empty state if none. "Connect New Database" dashed card expands connect form (Card with schema name input first, connection string input with placeholder "postgresql://user:password@host:port/database" and (?) tooltip, lock icon help text "Credentials never stored", "Connect Database" button). Footer: "Built for H0 Hackathon". States: logged out, logged in loading (skeleton schema cards), no schemas, has schemas, connecting (spinner + disabled), error (red border + alert), success (redirect), deleting schema (spinner + fade out). Use shadcn/ui Card, Input, Button, DropdownMenu, Dialog, Badge. Calls GET /api/schemas, POST /api/introspect.
```

**Step 5: Explorer Page (protected)**
```
src/app/explore/[schemaId]/page.tsx — interactive database ERD explorer. Protected route (middleware redirects to /login if no session). Fetch schema from backend on load.

Top bar (sticky, border-b): "← My Schemas" link + "·" separator + "SchemaLens" logo, schema name + stat badges (tables/columns/relations count as Badge secondary), Share button (outline), user email dropdown (DropdownMenu: email + "My Schemas" + "Log Out" red).

Left sidebar (w-80, border-r): search input "Filter tables...", scrollable table list (sparkle icon if AI docs exist + name + column count badge, accent highlight when selected, hover bg-muted), stats footer with documented count.

Center canvas (flex-1): React Flow (npm install @xyflow/react dagre @types/dagre). Custom TableNode: rounded-lg card — header (table name + column count badge, bg-secondary), body (first 3 columns: name · type), footer ("+N more" if >3 columns). Smoothstep edges for foreign keys. Auto-layout with dagre. Dot grid background. Minimap (bottom-right). Zoom controls (top-right). Canvas takes full height.

Right panel (w-96): slides in when table selected (animate-in slide-in-from-right). Header with table name + close button. Tabs: "Columns" (shadcn Table: column names are click-to-copy to clipboard, type, nullable Yes/No badge, default value; indexes section; foreign keys section with links) and "AI Docs" (empty state until generated, skeleton while loading, rendered markdown with "Last generated" timestamp when ready). "Generate AI Documentation" button (sparkle icon, full-width, shows spinner while loading; changes to "Regenerate Documentation" variant=ghost after generation).

States: loading (pulsing skeleton nodes + shimmer sidebar), empty (database illustration, "No tables found"), no relations (amber info banner), error (toast + retry), loaded (populated canvas), table selected (ring highlight + panel open), generating docs (button spinner + skeleton in docs tab), share dialog (modal with URL + copy button), 50+ tables (zoomed out overview).
```

**Step 6: Share Page**
```
src/app/share/[shareId]/page.tsx — public read-only schema viewer (no auth required). ISR revalidate every hour. Top banner with logo + schema name + stat badges. Center: read-only React Flow canvas (same TableNode, zoom/pan only, no drag, no click selection). Bottom panel (h-1/3, border-t): tabs "Tables" and "AI Documentation", shows selected table columns. Footer: "Built with SchemaLens · Aurora PostgreSQL + Vercel" (text-xs, muted). States: loading (full page skeleton), 404 (centered "Share link not found" + Go Home button), loaded (canvas + bottom panel). No share button, no generate button, no user menu.
```

**Step 7: 404 Page**
```
src/app/not-found.tsx — centered card: FileQuestion icon, "Page not found", "The page you're looking for doesn't exist or has been moved.", "Go Home" button.
```

---

## 10. UI/UX Best Practices (research-backed)

Sources: NNGroup (Skeleton Screens 101), VirtusLab (UX Patterns Beyond Raw Performance), IxDF (Progressive Disclosure).

### 10.1 State Handling

**The UI Stack (every view must handle all 5 states):**
1. Blank (first visit, no data yet)
2. Loading (data fetching)
3. Partial (some data loaded, more coming)
4. Error (fetch failed, timeout, invalid)
5. Ideal (all data loaded, fully interactive)

**Skeleton screens (NNGroup):**
- Use for full-page loads under 10 seconds. Never for sub-1-second loads (flashing skeleton feels broken).
- Mirror the real layout exactly — users build a mental model from the skeleton. Wrong shapes cause confusion.
- Always use animated shimmer (pulse left-to-right gradient). Static skeletons can look frozen/broken.
- NEVER use "frame-display" skeletons (header + footer only, blank body). They're equivalent to spinners — users assume the page crashed.
- Minimum display time: 300-600ms. A skeleton that flashes for 30ms looks like a rendering glitch.

**SchemaLens-specific skeleton rules:**
- Explorer page: 6-8 card-shaped placeholders (same 220x140px as TableNode), sidebar: 6 list-item shaped shimmer rows, top bar: stat badge placeholders
- Landing page: no skeleton needed (static content). Only the form submit button shows spinner.
- Share page: canvas area skeleton + bottom panel skeleton (table row shapes)

**Spinners vs skeletons:**
- Spinner: single module loading (button, card, inline action). Duration 2-10s.
- Skeleton: full-page loading. Duration 1-10s.
- Progress bar: any operation over 10 seconds (AI doc generation). Use asymptotic pattern: fast to 40-60%, then decelerate, snap to 100% on completion.

**Loading states for actions (VirtusLab):**
- AI doc generation: button shows spinner + "Generating..." (disabled). AI Docs tab shows 3-4 pulsing prose lines. If >10s, show progress bar pattern.
- Connection form: input disabled + button spinner + "Connecting...". Never blank the form.
- Share dialog: instant open (no loading). URL already generated server-side.

### 10.2 Perceived Performance (VirtusLab)

- Skeleton screens make waits feel 20-30% shorter (measured effect — users perceive skeleton-loaded pages as faster than spinner-loaded even with identical load times).
- Non-uniform loading animations feel more alive: vary speed, use easing curves, change arc lengths. Material Design indeterminate loader is the gold standard.
- Layout shift prevention: reserve space for async content. Use `min-height` on containers. Use `visibility:hidden` (keeps space) not `display:none` (collapses). Set explicit dimensions on images.
- React Flow canvas: the container div must have fixed dimensions before nodes load. Use `className="h-full w-full"` on a flex-1 parent to prevent CLS.

### 10.3 Progressive Disclosure (IxDF, NNGroup)

Show essential first. Reveal details on demand. Never overwhelm with everything at once.

**SchemaLens applications:**
- Landing page: only connection form visible. "How It Works" is simple 4-step grid, not detailed docs.
- Explorer: table nodes show name + first 3 columns only. Full columns on click (panel slides in).
- AI docs: generated on demand, not pre-loaded. User chooses which table to document.
- Share dialog: one button, one click. URL ready immediately.
- Right panel tabs: Columns tab first (most common). AI Docs second (deeper exploration).

### 10.4 Micro-Interactions & Feedback

Every user action must have immediate visual feedback:

| Action | Feedback | Timing |
|--------|----------|--------|
| Hover table in sidebar | bg-muted highlight | Instant (CSS :hover) |
| Click table in sidebar | bg-accent + ring-1 ring-primary | Instant |
| Click table node on canvas | ring-2 ring-primary + shadow-md | Instant |
| Panel slide-in | animate-in slide-in-from-right, duration-200 | 200ms |
| Panel close | animate-out slide-out-to-right, duration-150 | 150ms |
| Hover column row | bg-muted/50 | Instant |
| Toast appear | slide-in-from-right + fade-in | 300ms |
| Toast dismiss | fade-out | 200ms auto, or click to dismiss |
| Success toast | Green check icon, auto-dismiss 4s | 4s |
| Error toast | Red XCircle icon, stays until dismissed (user must see it) | Persistent |
| Copy to clipboard | "Copied!" toast, button briefly changes to check icon | 2s |

**Optimistic updates (VirtusLab):**
- Not heavily applicable to SchemaLens (read-heavy, few mutations). 
- One candidate: toggling table selection in sidebar — update highlight instantly, no need to wait.
- Rule: if you use optimistic update, you MUST implement rollback on failure.

### 10.5 Empty States (NNGroup + industry standard)

Empty state = illustration + helpful message + next action. Never show blank space.

| Context | Empty State |
|---------|------------|
| No tables in schema | Database icon (muted), "No tables found", "This schema appears to be empty. Try connecting to a different database." |
| No relations | Info banner: "No foreign key relationships detected. Tables are displayed without connections." (amber, not red — this is informational, not an error) |
| No AI docs yet | "No documentation yet" + "Generate AI Documentation" button. Not an error — it's an opportunity. |
| No search results | "No tables match 'xyz'" + "Clear filter" button |
| 404 page | FileQuestion icon, "Page not found", "The page you're looking for doesn't exist or has been moved.", "Go Home" button |
| Invalid share link | "This share link doesn't exist or has been removed." (not "404" — more helpful) |

### 10.6 Keyboard & Accessibility

- **Escape** closes the right panel (when table selected)
- **Ctrl/Cmd + K** focuses the search input in sidebar
- **Tab** cycles through sidebar items
- **Arrow keys** navigate table list when focused
- **aria-label** on all icon-only buttons: "Close panel", "Search tables", "Share schema", "Copy link", "Zoom in", "Zoom out", "Fit view"
- **aria-hidden="true"** on decorative icons (lock icon near credentials text, sparkle icon on generate button)
- Canvas SVG elements: add `role="application"` and `aria-label="Schema diagram"` to the React Flow container
- Table nodes: `role="button"`, `tabIndex={0}`, `aria-label="Table: {name}, {count} columns"`
- Color contrast: All text meets WCAG AA (4.5:1 ratio). Semantic tokens handle this automatically in both themes.
- Focus visible: All interactive elements have visible focus ring (ring-2 ring-ring) when tabbed.

### 10.7 Toast Best Practices

- **Success**: Green, auto-dismiss 4s. Used for: docs generated, URL copied, schema loaded.
- **Error**: Red, persistent (user must read it). Retry button included. Used for: connection failed, schema load failed, docs generation failed.
- **Info**: Blue, auto-dismiss 3s. Used for: "Tables displayed without relationships" (no FKs).
- Position: bottom-right. Don't stack more than 3 toasts.
- Rich colors mode (sonner richColors prop).

### 10.8 Dark Mode

- Default: dark theme (developer tools audience prefers dark).
- Toggle: not needed for MVP (waste of precious screen space). System preference respected via `enableSystem`.
- All colors use semantic tokens: `bg-background`, `bg-card`, `bg-secondary`, `bg-muted`, `text-primary`, `text-muted-foreground`, `border`, `ring-primary`.
- Canvas: dot grid color adapts (`stroke-muted-foreground/20`).
- Never use raw hex colors or Tailwind color names (slate-900, gray-100, etc.). Always use token classes.

### 10.9 Checklist

- [ ] **Loading** — skeleton that mirrors real layout, shimmer animation, 300-600ms minimum
- [ ] **Empty** — illustration + helpful message + next action (never blank)
- [ ] **Error** — sonner toast (red, persistent) + retry button
- [ ] **Success** — rendered per layout above
- [ ] **Submitting** — button disabled + spinner + form inputs frozen
- [ ] **Progressive disclosure** — simple first, details on click
- [ ] **Micro-interactions** — every action has instant feedback per table above
- [ ] **Layout stability** — no CLS, reserved space, visibility:hidden not display:none
- [ ] **Keyboard** — Escape closes panel, arrow keys navigate, Ctrl+K focuses search
- [ ] **Accessibility** — aria-labels, focus rings, WCAG AA contrast
- [ ] **Dark mode** — semantic tokens only, no raw colors
- [ ] **404** — friendly message, not generic

---

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-19 | Initial prompt (ReUI-based) |
| 2.0 | 2026-06-19 | Rewritten for v0 native (shadcn/ui, removed ReUI) |
| 3.0 | 2026-06-19 | Frontend-only focus. Removed API specs, types, client code. |
| 4.0 | 2026-06-19 | Added Section 10: UI/UX best practices (NNGroup, VirtusLab, IxDF research). |
| 5.0 | 2026-06-19 | Added auth: Login + Register pages, auth-aware landing, user menu in explorer, NextAuth SessionProvider. Indexes section in column details. |
| 6.0 | 2026-06-19 | Demo-readiness pass: Schema name field in connect form, connection string format placeholder + (?) help tooltip. Explorer: "← My Schemas" back navigation, AI docs sparkle badges in sidebar table list (with documented count in footer), click-to-copy column names, post-generation "Regenerate" button + "Last generated" timestamp. Share page: table list + column detail split-panel in bottom section. Landing: kebab menu on schema cards (Rename + Delete with confirm dialog). Password visibility toggles on Login + Register. |
| 7.0 | 2026-06-20 | Switched auth from NextAuth v4 to better-auth (v0-native). Updated Global Rules, Login/Register pages, and v0 generation steps accordingly. |
