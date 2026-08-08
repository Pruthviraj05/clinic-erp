# Clinicore — Roadmap, Testing Strategy & Scalability

## 1. Immediate next steps (in order)

1. **MongoDB persistence** — implement `StoragePort` over the `mongodb` driver per
   `src/server/repositories/README.md`; set `MONGODB_URI`, `NEXT_PUBLIC_DATA_MODE=mongodb`;
   seed script from the demo dataset. *(No UI or action changes.)*
2. **Switch on authentication** — the credentials path is already built (scrypt hashes in
   `src/server/demo/users-store.ts`, `src/lib/auth/credentials.ts`, the login form, and admin account
   management). To activate: set `NEXT_PUBLIC_AUTH_MODE=credentials`, then harden with signed session
   tokens (JWT/iron-session) instead of the role cookie, rate limiting and lockout. Mobile OTP and
   Google plug into the same `authenticate()` seam. Activating also lets us drop the hardcoded demo
   doctor mapping (`"doc_mehta"`) in services/actions in favour of `user.linkId`.
3. **Real integrations** (currently simulated at clean boundaries):
   - WhatsApp/SMS/email: worker that consumes unsent notification rows (provider: WATI/Gupshup/Twilio + Resend/SES).
   - PDF generation: server-render the existing print layouts (Playwright/`@react-pdf`).
   - File uploads: S3-compatible storage for EMR records + consent signatures.
4. **Global search** — the topbar search button is currently decorative; wire a cmdk command
   palette over patients/appointments/invoices (the `cmdk` dependency is already installed).

## 2. Near-term product modules (data model ready)

- **Referral management + analytics** (sources on patient, per-source conversion/revenue dashboards).
- **Disease tagging & analytics** (patients per disease, revenue per disease, trends, age/gender splits).
- **Follow-up automation** (reminder rows generated from `prescription.followUpDate`; reception "today's follow-ups" panel).
- **Medical certificates** (one-click templates: medical/fitness/leave/rest/referral letters — reuse the Rx print pipeline).
- **Multi-language** — prescriptions already print in English/मराठी/bilingual
  (`src/lib/rx-labels.ts`); extend the same dictionary approach to the whole UI with `next-intl`,
  then add Hindi/Gujarati/Tamil.

## 3. Future modules (architecture keeps space)

Pharmacy & lab management · OPD/IPD · insurance claims workflow · WhatsApp bot booking ·
patient mobile app (the portal is already the API shape) · doctor mobile app · offline/PWA sync ·
barcode scanning (QR IDs exist) · API marketplace (REST layer via `src/lib/api/*` helpers).

## 4. AI assistance (recommended, decision-support only)

- Auto-suggest diagnoses from reception-entered complaints (doctor confirms).
- Smart medicine suggestions ranked from the doctor's own templates + history.
- Auto-draft follow-up advice from diagnosis; doctor edits.
- OCR import of old paper prescriptions/reports into structured EMR.
- Consultation summary drafts for doctor review before save.
All AI output passes through the existing consult screen — the doctor always confirms; nothing
auto-commits to the record.

## 5. Testing strategy

| Layer | Today | Next |
|---|---|---|
| Unit + action integration (Vitest) | 68 tests: RBAC matrix, inventory math, schemas, demo-data integrity, formatters, Rx labels, credentials hashing, disease groups, and server actions (prescription create/revise, consent workflow + ownership, admin account rules) run against mocked `next/headers` | billing rounding/rollback, reschedule clash |
| Types/lint | `tsc --noEmit` + ESLint in CI, enforced by `npm run build` | — |
| Route smoke | scripted role×route sweep against a production build | promote into CI |
| E2E | manual browser walkthrough (documented) | Playwright: consult flow, billing flow, RBAC denials |
| Load | n/a in demo mode | after MongoDB: index-backed list queries, k6 on hot routes |

## 6. Scalability plan

- **Tenancy**: every query scoped by `organizationId` (+ `branchId`); enterprise = many branches, same model.
- **Data**: MongoDB Atlas, indexes per `docs/02-architecture.md`; append-only audit; object storage for binaries.
- **Compute**: stateless Next.js nodes; notification/PDF workers on a queue (BullMQ/Redis when needed).
- **Caching**: React `cache()` per request today; Redis for hot lookups (masters, branding) later.
- **SEO**: marketing site only — the app itself stays behind auth (`noindex`).
