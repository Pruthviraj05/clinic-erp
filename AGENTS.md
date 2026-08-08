# Clinicore — Clinic ERP · Engineering guide

Enterprise, multi-branch clinic management system.

## Stack
- **Next.js 15** (App Router, RSC) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** · **shadcn/ui** (`base-nova` style → components are **Base UI**, not Radix)
- **MongoDB planned** (storage port in `src/server/repositories/`; Prisma schema kept as the ER reference)
- Recharts (charts) · react-hook-form + zod (forms/validation) · next-themes (dark mode)

## Base UI, not Radix — important
`components.json` uses the `base-nova` style, so `src/components/ui/*` wrap **Base UI**
(`@base-ui/react/*`). Composition uses the **`render` prop**, NOT `asChild`:

```tsx
// ✅ Base UI
<Button render={<Link href="/x" />}>Label</Button>
<DropdownMenuTrigger render={<Button variant="ghost" />}>…</DropdownMenuTrigger>
// ❌ Radix-style (will not typecheck)
<Button asChild><Link href="/x">Label</Link></Button>
```
Provider prop names also differ (e.g. `TooltipProvider delay=`, not `delayDuration`).

## Architecture (layers)
```
src/
  app/(auth)/login        role-switch login (temporary auth)
  app/(app)/{admin,doctor,reception,portal}   role sections (guarded by layout)
  components/ui           Base UI primitives (generated)
  components/shared       reusable app components (DataTable, StatCard, PageHeader…)
  components/layout       app shell (sidebar, topbar)
  components/charts       Recharts wrappers (client; props must be serialisable)
  features/<domain>       feature-specific UI
  server/services         read/write facade the pages call
  server/repositories     Prisma data access (production path)
  server/demo             demo dataset (current data source; see appConfig.dataMode)
  lib                     session, rbac, guard, format, db, api helpers
  config                  app config + navigation
  types                   domain view-types (decoupled from Prisma)
prisma/schema.prisma      full domain schema
```

## Data mode
`appConfig.dataMode` is `"demo"` until `DATABASE_URL` points at a real DB. The service
layer returns domain view-types; swapping demo → Prisma repositories changes no UI.

## Auth (temporary, swappable)
No real auth yet. `signInAs(role)` sets a cookie; `getSession()` (`src/lib/session.ts`)
resolves it. Real auth replaces ONLY `session.ts` + the login action — every consumer
reads through `getSession()` / `requireRole()`.

## Conventions
- Server Components by default; add `"use client"` only for interactivity.
- Never pass functions/class instances as props into client components (not serialisable) —
  pass a string/enum and build the function inside the client component.
- Money = `Decimal(12,2)`. Dates via `src/lib/format.ts`. Enums labelled via `humanizeEnum`.
- Tenant isolation: every query is scoped by `organizationId` (+ `branchId` where relevant).

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (typechecks; ESLint skipped in build, run `npm run lint` separately)
- `npx prisma generate` / `npx prisma migrate dev` — Prisma
