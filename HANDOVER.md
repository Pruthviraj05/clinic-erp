# Clinicore — Clinic ERP · Session Handover

> Handover + context for continuing this project in a new session.
> Last updated: 2026-08-08. (Major update: teleconsult removed, granular RBAC, full CRUD,
> doctor consult screen, MongoDB-ready storage port, perf+mobile passes, docs/ suite.)

---

## 1. What this is

**Clinicore** — an enterprise, multi-branch **Clinic Management System (ERP)** built to a large spec
(dashboards, appointments, EMR, prescriptions, billing, inventory, masters, reports, analytics,
notifications, teleconsult, consent e-sign, insurance, roster, RBAC, audit).

- **Project root:** `C:\Users\Admin\Desktop\New folder (2)\clinic-erp`
- **Parent folder** (`New folder (2)`) also contains unrelated business docs — the app lives ONLY in `clinic-erp/`.

## 2. Stack (pinned — do not silently upgrade)

| Thing | Version / choice | Notes |
|---|---|---|
| Next.js | **15.5.22** (App Router, RSC) | scaffold shipped 16; pinned back to 15. Dev uses **Turbopack** (`next dev --turbopack`). |
| React | 19.2.4 | |
| TypeScript | strict | |
| Tailwind | v4 | CSS-based config in `src/app/globals.css` (healthcare teal theme, light+dark). |
| shadcn/ui | **`base-nova` style → Base UI, NOT Radix** | see §4 — this is the #1 gotcha. |
| Prisma | **6.19.3** | v7 dropped `datasource url`; pinned to 6. |
| Charts | Recharts 3 | do NOT add to `optimizePackageImports` (breaks build). |
| Excel | `xlsx` (SheetJS) | `src/lib/export.ts`. |
| QR | `qrcode` | `src/lib/qr.ts` (server-side data URLs). |
| Tests | Vitest | `npm test` → **29 tests, 5 files**. |

## 3. How to run / verify

```bash
cd "clinic-erp"
npm run dev        # Turbopack dev (reclaims port 3000; may use 3001+ if busy)
npm run build      # production build — ENFORCES eslint + typecheck. 55 page files / ~48 routes.
npm test           # vitest run — 29 unit tests
npm run lint       # eslint (flat config via FlatCompat)
```

- **Login:** no real auth. `/login` shows a **role switcher** (Admin/Doctor/Receptionist/Patient); selecting a role sets a cookie and opens that workspace.
- **Route smoke test:** `../<scratchpad>/smoke.mjs` exists from earlier (hits every route per role). Run against a **production** server (`npm run build && PORT=3100 npx next start`, then `BASE=http://localhost:3100 node smoke.mjs`) — dev/Turbopack soft-redirects made guard checks flaky.

## 4. CRITICAL gotchas (read before editing UI)

1. **Base UI, not Radix.** `components.json` uses style `base-nova`, so everything in `src/components/ui/*`
   wraps `@base-ui/react/*`. Consequences:
   - Compose with the **`render` prop**, NOT `asChild`. For trigger/link-buttons prefer
     `className={buttonVariants(...)}` on the native element (nesting `<Button>` inside a trigger = nested-button crash).
   - `DropdownMenuLabel` = `Menu.GroupLabel` → **must be wrapped in `<DropdownMenuGroup>`** or it throws
     "MenuGroupContext is missing" (this crashed every page once — the topbar user menu).
   - Prop names differ: `TooltipProvider delay=` (not `delayDuration`), `Switch checked/onCheckedChange`, Select is controlled (`value`/`onValueChange`).
   - **Forms use native `<select>`/`<input>` + server actions** (not Base UI Select) for reliability — see the dialogs.
2. **Client component props must be serializable.** Never pass a function into a client component from a server
   component (charts take a `format: "number"|"currency"` string, not a formatter fn).
3. **`server-only`** is imported by services; a Vitest shim (`src/test/server-only-shim.ts`) aliases it so
   services are unit-testable.
4. **Test files excluded** from Next build/lint via `tsconfig.json` + `eslint.config.mjs`.
5. The parent-dir `AGENTS.md`/`CLAUDE.md` note about `node_modules/next/dist/docs/` was a stale Next-16 template
   artifact — **ignore it**; standard Next 15 App Router applies. Accurate guide is in `clinic-erp/AGENTS.md`.

## 5. Architecture

```
src/
  app/(auth)/login                         role-switch login
  app/(app)/{admin,doctor,reception,portal} role sections (each has layout.tsx w/ requireRole)
  app/(app)/loading.tsx                    streamed skeleton
  middleware.ts                            EDGE auth/role redirects (the real guard — clean 307s)
  components/ui                            Base UI primitives (generated)
  components/shared                        DataTable, StatCard, SectionCard, StatusBadge, PageHeader,
                                           EmptyState, DateNavigator, SignaturePad
  components/layout                        app-shell(+client), sidebar (collapsible), topbar, sign-out-button
  components/charts                        Recharts wrappers (client; serializable props only)
  features/<domain>                        feature UI (appointments, patients, prescriptions, billing,
                                           inventory, calendar, consent, teleconsult, roster, insurance,
                                           masters, reports, notifications, staff, records, settings, auth)
  server/services                          read facade (appointments, patients, prescriptions, billing, dashboard)
  server/actions                           write server actions (appointment, patient, inventory, billing,
                                           consent, settings, session)
  server/demo                              CURRENT data source: data.ts, extra.ts, inventory-store.ts,
                                           settings-store.ts  (mutable in-memory)
  lib                                      session, rbac, guard, format, db, qr, export, clinic, api/*
  config                                   app.config.ts, navigation.ts
  types/domain.ts                          view-types (decoupled from Prisma)
prisma/schema.prisma                       full domain schema (~40 models) — validates + generates
```

### Data mode (important)
- `appConfig.dataMode` is **`"demo"`**. All UI reads through **services** that currently return objects
  shaped exactly like the Prisma models, sourced from `src/server/demo/*` (mutable arrays).
- **Writes** (create appointment/patient/medicine, adjust stock, pharmacy bill, sign consent, save Rx template)
  mutate those in-memory arrays via server actions + `revalidatePath`. They persist for the life of the dev
  process (reset on restart/HMR of the module). This is intentional for demo mode.
- **Switching to a real DB:** implement `server/repositories/*` (Prisma) and point the services at them —
  no UI changes. Needs `DATABASE_URL` + a `prisma/seed.ts` (NOT yet written).

### Auth (temporary, swappable)
- `signInAs(role)` (`server/actions/session.actions.ts`) sets cookie `clinicore_role`.
- `getSession()` (`lib/session.ts`) resolves it → `SessionUser`. `requireRole()` (`lib/guard.ts`) guards layouts.
- `middleware.ts` does the actual redirecting BEFORE render.
- **Real auth = change only `session.ts` + the login action + middleware token check.** Everything else reads through `getSession()`.

## 6. RBAC / roles
- Roles: ADMIN (all), DOCTOR (own patients/appts/rx, teleconsult, roster, calendar), RECEPTIONIST (branch:
  appts/patients/billing/calendar), PATIENT portal (own data).
- Coarse map in `lib/rbac.ts` (`ROLE_MODULES`, `canAccess`, `ROLE_HOME`). Nav per role in `config/navigation.ts`.
- Prisma has granular Role/Permission tables ready for when real auth lands.

## 7. Features DONE (all building + tested)

Dashboards ×4 · Appointments (book/queue/status, **date filter**, Excel export) · Patients + **EMR** (registry,
registration dialog, profile w/ timeline tabs, **patient QR ID card**) · Prescriptions (list + **print-ready**
Rx with **real QR**, **customizable header/footer** via Settings) · Billing (invoices, GST invoice print,
**date filter**, export, **"New pharmacy bill" that deducts inventory** with movement+user) · **Inventory**
(add medicine, **adjust stock w/ username tracking**, **movements log**, **low-stock banner + WhatsApp/email
alert trigger**, on-screen stock, export) · Masters (tabbed) · Reports (export cards) · Analytics (charts) ·
Notifications · **Calendar (month + week, prev/next nav)** · Branches/Doctors/Receptionists · Roles matrix ·
**Audit log** (date filter, export) · Settings (General/Prescription/WhatsApp/Email/Notifications) ·
Teleconsult room · **Consent e-signature** (canvas SignaturePad) · Insurance/TPA · Doctor roster & leave ·
**Collapsible sidebar** + **always-visible Sign out** + responsive + light/dark.

Key tested logic: `inventory-store.ts` deduction/stock math, RBAC scoping, validation schemas, demo-data
referential integrity, formatters.

## 8. DONE since 2026-08-03 (this session)

1. **Teleconsult removed entirely** (routes, feature, nav, demo data, `ONLINE`/`TELECONSULT` enums) — offline-clinic product.
2. **Granular RBAC**: `PERMISSIONS` matrix (module × view/create/edit/delete/export/print) in `lib/rbac.ts`;
   `authorize()` in **every** server action; `requirePermission()` for pages; UI buttons gated by `can()` props;
   Roles & Access page renders the real matrix. Scoped reads fixed (invoice detail by branch/patient, consent ownership, patient self-booking).
3. **Doctor consult screen** (`/doctor/consult` queue → `/doctor/consult/[id]`), modeled on the MNAS reference:
   case-history Repeat, quick-start + saveable templates (`server/demo/template-store.ts`), vitals, tag inputs,
   medicine rows (drug autocomplete + free text, dose-pattern buttons, duration presets), follow-up presets,
   live A4 preview w/ letterhead toggle, Save & Complete → creates Rx + completes appointment + audit row.
4. **Full CRUD**: patients (edit/deactivate), appointments (reschedule w/ clash check), medicines (edit/deactivate),
   masters (add/edit/toggle), branches/doctors/receptionists (create/edit/deactivate), notifications (mark read),
   billing (**consultation invoices** with GST slabs + **partial payment collection**), pharmacy bill hardened
   (per-medicine aggregation, rollback, 12% GST, rounding).
5. **Storage port** (`server/repositories/`): `db` object over the demo arrays; `README.md` = MongoDB adapter guide.
   `appConfig.dataMode` is now `"demo" | "mongodb"`. **User will use MongoDB (no Postgres).**
6. **Audit trail is live**: `logAudit()` called by every mutation.
7. **Perf**: xlsx + recharts lazy-loaded, zod out of client bundles, Map lookups, RSC table primitive.
8. **Bug fixes ×10** (recon-verified): billing float/GST/stock bugs, DateNavigator TZ, fixed-TZ Intl formatting,
   portal booking dead-end, MRN off-by-one, date validation, scoping holes.
9. **Mobile pass**: dialog max-height, drawer auto-close, tabs scroll, responsive dialog grids, donut resize,
   print-view padding/wrap, `pointer-coarse` touch targets. Verified at 375px.
10. **Docs suite** in `docs/` (PRD, architecture, workflows, permission matrix, roadmap) + 34 unit tests green.

## 8b. DONE in the second batch (2026-08-08, later)

11. **Prescription editing**: `/doctor/prescriptions/[id]/edit` reuses the consult screen prefilled;
    `updatePrescriptionAction` (own-prescriptions-only, audit-logged, never deletes).
12. **Case history upgraded**: every past visit shows full medicine lines + advice + follow-up with
    **Repeat / View / Edit** actions.
13. **Per-doctor Rx design** (`/doctor/rx-design`): own header, footer, accent colour, default language,
    QR/vitals toggles + live preview → `src/server/demo/rx-design-store.ts`.
14. **Prescription redesign + language**: accent-branded A4, patient identity block, allergy warning
    banner, follow-up highlight; labels in **English / मराठी / bilingual** via `src/lib/rx-labels.ts`
    with an on-page switcher.
15. **Disease lists**: `src/server/demo/disease-store.ts` + `disease.actions.ts`; tag patients mid-consult
    (create list inline), browse at `/doctor/diseases`.
16. **Auth built but OFF**: `users-store.ts` (scrypt), `lib/auth/credentials.ts`, `signInWithPassword`,
    `features/auth/password-form.tsx`. Gate = `appConfig.authMode` / `NEXT_PUBLIC_AUTH_MODE`
    (`demo` today). Seeded accounts password: **`Clinic@123`**.
17. **Admin creates admin** (`/admin/admins`): create administrators (hashed), activate/deactivate,
    last-active-admin protection.
18. **Consent workflow**: reception creates + assigns a doctor + fills basic info
    (`/reception/consent`); assigned doctor edits (`/doctor/consent`); patient e-signs; signed = locked.
19. **Tests: 68** (12 files) incl. server-action integration tests that mock `next/headers`.

## 9. PENDING / next steps (in priority order)

1. **MongoDB adapter** (user's stated direction): implement `StoragePort` per `src/server/repositories/README.md`,
   seed from demo data, set `MONGODB_URI` + `NEXT_PUBLIC_DATA_MODE=mongodb`.
2. **Switch auth on**: set `NEXT_PUBLIC_AUTH_MODE=credentials`, then harden (signed session token
   instead of the role cookie, rate limiting, OTP/Google). Also replace the demo doctor mapping
   (`"doc_mehta"` hardcoded in services/actions) with `user.linkId`.
3. **Real integrations**: WhatsApp/SMS/email worker over notification rows; server PDF; S3 uploads.
4. **Global search**: topbar button is decorative — wire a cmdk palette (dependency already installed).
5. Product roadmap (referrals analytics UI, certificates, follow-up automation, full-UI i18n):
   see `docs/05-roadmap.md`.

## 10. Verification status at handover (2026-08-08)
- `npm run build` ✓ (~56 routes + middleware, typecheck enforced) · `npx tsc --noEmit` ✓
- `npm test` ✓ 68/68 · `npm run lint` ✓ clean
- Browser-verified: consult flow end-to-end (queue → template → Save & Complete → print-ready Rx +
  audit row), all admin CRUD surfaces present, mobile 375px (no horizontal overflow on dashboard /
  consult / prescription). NOTE: the in-app browser pane may report `document.hidden: true` (not
  compositing) — coordinate clicks/screenshots get flaky; drive interactions via DOM
  (`javascript_tool`) or `read_page` a11y tree.

## 11. Handy references
- Engineering guide: `clinic-erp/AGENTS.md` · Product/tech docs: `clinic-erp/docs/01-05*.md`
- Domain view-types: `src/types/domain.ts`
- Storage port + MongoDB guide: `src/server/repositories/` (schema reference: `prisma/schema.prisma`)
- Demo data (edit to change seed content): `src/server/demo/data.ts`, `extra.ts`, `inventory-store.ts`,
  `template-store.ts`, `settings-store.ts`
