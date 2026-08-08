# Clinicore — Technical Architecture

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router, RSC) · React 19 · TypeScript strict | Server Components by default |
| Styling | Tailwind CSS v4 · shadcn/ui **base-nova** (Base UI, *not* Radix) | compose with `render` prop, never `asChild` |
| Charts | Recharts 3 (lazy via `next/dynamic`, `ssr:false`) | never add to `optimizePackageImports` |
| Validation | zod (server + shared schemas); zod-free `constants.ts` for client bundles | |
| Data (today) | In-memory demo store (`src/server/demo/*`) | resets on server restart — intentional |
| Data (planned) | **MongoDB** via the storage port | `src/server/repositories/README.md` is the implementation guide |
| Exports | SheetJS `xlsx`, dynamically imported in the click handler | keeps ~143 kB out of route bundles |
| QR | `qrcode` server-side data URLs | |

## 2. Layered architecture

```
Request → middleware.ts (edge role guard, 307s)
        → app/(app)/<role>/… layout (requireRole → session)
        → page.tsx (RSC: reads via services, computes can() props)
            → server/services/*   read facade (scoped queries)
            → server/actions/*    write facade ("use server", authorize() + zod + logAudit + revalidatePath)
                → server/repositories (storage port `db`) ──→ demo adapter (today) / mongodb adapter (planned)
                → server/demo/*   demo dataset + domain stores (inventory, templates, settings)
        → features/<domain>/*     client components (dialogs, views, consult screen)
        → components/{ui,shared,layout,charts}
types/domain.ts = the contract between all layers (UI never sees driver documents)
```

**Write-path convention (every mutation):**
```ts
const authz = await authorize("<module>", "<action>");   // RBAC, returns ActionResult failure
if (!authz.ok) return authz;
const parsed = schema.safeParse(...);                     // zod validation, fieldErrors back to the form
...mutate via db.* / domain store...
logAudit({ actor, role, action, entity, summary });       // audit trail
revalidatePath(...every route that renders the data);
return { ok: true, message, data };
```

## 3. Database design

`prisma/schema.prisma` holds the full relational model (~40 models) — kept as the canonical ER
reference even though the runtime target is MongoDB. Aggregate roots and their Mongo collections:

| Aggregate | Collection | Key indexes / notes |
|---|---|---|
| Organization → Branch | `branches` | tenant scoping key on every other collection |
| User / Role / Permission | `users`, `roles` | granular RBAC persistence when real auth lands |
| Patient | `patients` | unique `mrn`, index `phone`, `fullName` text index |
| Appointment | `appointments` | `{doctorId, scheduledStart}`, `{branchId, scheduledStart}`; token per branch/day |
| Prescription (embedded medicines) | `prescriptions` | `{patientId, createdAt}`, `{doctorId, createdAt}` — document model fits directly |
| Invoice (embedded items) | `invoices` | unique `number`; amounts as paise integers or `Decimal128` |
| Medicine + StockMovement | `medicines`, `stock_movements` | deduction inside a Mongo transaction |
| RxTemplate | `rx_templates` | `{doctorId}` |
| ConsentForm | `consent_forms` | signature asset in object storage |
| Notification / AuditLog | `notifications`, `audit_log` | audit is append-only |
| Masters | `masters` (group field) | departments, lab tests, tax rates… |

Migration path is mechanical: each `EntityStore<T>` port method maps 1:1 to a Mongo call
(see `src/server/repositories/README.md`). Multi-tenancy = add `organizationId` to every filter.

## 4. API structure

The app is server-action-first (no REST surface needed by the UI). `src/lib/api/*` provides the
response/pagination helpers for a future public REST layer (`/api/v1/*` route handlers) — the JSON
envelope (`ok/created/fail/paginationMeta`) is already standardized. Server actions are the internal
API and are enumerated per domain in `src/server/actions/*` (all `authorize()`-gated).

## 5. Security architecture

1. **Edge**: role-prefix routing enforced in `middleware.ts` before any server work.
2. **Session**: single `getSession()` contract (React `cache()`d per request). Real auth = JWT/session
   verification swapped into this one file + middleware.
3. **Authorization**: `PERMISSIONS` matrix, `can()/authorize()/requirePermission()`.
4. **Row-level scoping**: doctors see own patients/appointments; receptionists their branch;
   patients only themselves (invoice detail, consent signing, self-booking all enforced server-side).
5. **Audit**: every mutation appends an audit row; clinical records are never hard-deleted.
6. **Validation**: zod on every input; dates NaN-guarded; money rounded; enum allow-lists.
7. Planned: password hashing + OTP, signed sessions, rate limiting on auth endpoints, 2FA,
   encrypted-at-rest MongoDB (Atlas), HIPAA-inspired access logging (read-audit).

## 6. Performance decisions

- `xlsx` loaded inside the export handler (`await import("xlsx")`).
- Recharts behind `next/dynamic` `ssr:false` wrappers (`components/charts/lazy.tsx`).
- Client dialogs import zod-free `constants.ts`, keeping zod server-side.
- Fixed `timeZone: Asia/Kolkata` in all Intl formatting — SSR/client output identical (no hydration drift, correct on UTC servers).
- Demo-store lookups via `Map`s; single-pass counters in services.
- `ui/table.tsx` is a Server Component (no "use client" tax on static tables).

## 7. Deployment architecture (target)

Vercel or Node/Docker behind Nginx. `NEXT_PUBLIC_DATA_MODE=mongodb`, `MONGODB_URI` (Atlas),
object storage (S3-compatible) for uploads/signatures, transactional email/WhatsApp providers as
queue-backed workers (the notification rows are already the queue contract). CI = typecheck + lint +
vitest + build (all currently green: 34 tests, ~50 routes).
