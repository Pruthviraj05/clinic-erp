# Clinicore — Product Requirements Document (PRD + BRD + FRS)

> Enterprise multi-clinic management software for **offline clinics** (no video consultation).
> Version 1.0 · 2026-08-08 · Status: demo data mode, MongoDB backend planned.

---

## 1. Vision & business requirements (BRD)

Clinicore is the operating system for modern clinics in India: appointments, EMR,
prescriptions, billing (GST), inventory and analytics — unified across every branch.

**Business goals**
1. Cut doctor consultation documentation to **under two minutes** (templates, one-click repeat, minimal typing).
2. Let reception complete maximum data entry so doctors only make clinical decisions.
3. One product that scales from a **single-doctor practice** to an **enterprise multi-branch chain** without re-platforming.
4. GST-ready billing with clean audit trails (medico-legal safety: clinical records are never hard-deleted).
5. Referral & disease analytics that grow the practice (which sources bring which patients and revenue).

**Deployment shapes supported by the architecture**
- Single doctor practice · multiple doctors in one clinic · one doctor across multiple clinics ·
  multi-branch clinic · enterprise chain. All are the same data model: `Organization → Branch → Staff/Patients`,
  with doctors linked to **multiple branches** (`Doctor.branchIds`) and per-branch prescription branding
  (`clinicFromBranch()` builds the letterhead from the branch record, so switching branch switches branding automatically).

**Revenue/positioning**: SaaS subscription per branch + per-doctor seats; demo mode doubles as the sales demo.

## 2. User roles & permissions

Roles today: **Admin** (clinic owner/branch admin), **Doctor**, **Receptionist**, **Patient** (portal).
The Prisma schema already models granular Role/Permission tables for future custom roles
(Super Admin, Billing Staff, Accountant, Pharmacist, Lab Staff).

Every module carries six actions — **view / create / edit / delete / export / print** — enforced by a
single matrix (`src/lib/rbac.ts → PERMISSIONS`) at three layers:
1. **Edge middleware** — wrong-role URLs 307-redirect before any render.
2. **Server actions** — every mutation starts with `authorize(module, action)`.
3. **UI affordances** — pages compute `can(role, module, action)` and hide buttons the role can't use.

The live matrix is rendered at **Admin → Roles & Access**. Full table: [04-permissions.md](04-permissions.md).

**Deliberate rules**
- Nobody deletes clinical records (prescriptions/EMR); appointments are *cancelled*, never deleted.
- Receptionists run the front desk (patients, appointments, billing) — no clinical analytics, no administration.
- Patients see/print their own records only, and can self-book appointments (server forces `patientId` to self).

## 3. Functional requirements (FRS) — implemented

### 3.1 Authentication (built, switched off)
Role-switch login sets a session cookie; `getSession()` is the single contract.

**Credentials login is implemented but disabled**: `appConfig.authMode` is `"demo"`. Setting
`NEXT_PUBLIC_AUTH_MODE=credentials` renders the email/password form on `/login`, which authenticates
against the users store (scrypt hashes, per-user salt) via `src/lib/auth/credentials.ts` and issues
the same session cookie — no other code moves. Seeded accounts use password `Clinic@123`.
Mobile OTP and Google slot into the same `authenticate()` seam.

**Admin creates admin** (`/admin/admins`): administrators create other administrator accounts with
hashed passwords, and activate/deactivate any account. The last active administrator cannot be
deactivated. Accounts are inert records until credentials mode is switched on.

### 3.2 Patient management
- Registration (reception/admin): name, gender, DOB, blood group, phone, email, city, allergies, chronic diseases. MRN auto-generated (max+1 — collision-safe).
- Edit + soft deactivate/reactivate (admin delete rights; reception edit).
- Profile: demographics, timeline tabs (overview / timeline / prescriptions / records / billing), **QR patient ID card**.
- EMR: uploaded records catalogue (lab reports, imaging) per patient.

### 3.3 Appointments
- Book (reception/admin/patient-portal), types Scheduled/Walk-in/Follow-up/Emergency; walk-ins check in immediately.
- Token number auto-assigned per branch per day. Exact-slot double-booking blocked per doctor.
- Status queue: Scheduled → Confirmed → Checked-in → In-progress → Completed (+ Cancelled, No-show, Rescheduled).
- **Reschedule** with clash check; date filter; Excel export; calendar month/week views.

### 3.4 Doctor consultation (the 2-minute flow)
`/doctor/consult` = today's queue → open patient → single screen with:
- Case history with one-click **Repeat** of a previous prescription.
- **Quick-start disease templates** + doctor-saved templates ("Save as template").
- Vitals (BP, pulse, weight, height, temp, SpO₂) — optional.
- Tag-style complaints (appointment reason preloaded), diagnosis with ICD-style suggestions,
  investigations (from Lab Tests/Investigations masters), advice.
- Medicine lines: drug autocomplete from inventory **plus free text**, dose-pattern quick buttons
  (`1-0-0`, `0-0-1`, `1-0-1`, `1-1-1`, `½-0-0`, `SOS`, `Weekly`), before/after food, duration presets + custom, instructions.
- Follow-up presets (3d/1w/2w/1m/6w) or date picker.
- **Live A4 preview** with letterhead on/off (for pre-printed stationery).
- **Save & Complete**: creates the prescription, completes the appointment, stamps patient last-visit,
  writes the audit row, lands on the print-ready Rx.

### 3.5 Prescriptions
Print-optimized A4 with clinic branding per branch, doctor credentials + registration number, patient
identity block with **allergy warning**, vitals, Rx table, advice, follow-up, **verification QR**, signature block.
Share/PDF are simulated at the boundary (integration point documented).

- **Per-doctor design** (`/doctor/rx-design`): each doctor sets their own header line, footer note,
  accent colour and default print language, with a live preview. Falls back to the clinic-wide
  template from Settings when unset.
- **Language**: labels render in **English / मराठी / bilingual**; a switcher on the prescription lets
  the doctor flip before printing. Clinical content (drug names, notes) always prints as typed.
- **Editing**: a saved prescription can be revised at `/doctor/prescriptions/[id]/edit` using the same
  consult interface, prefilled. Doctors edit only their own; the revision is audit-logged. Clinical
  records are never deleted — editing is the only mutation.

### 3.5b Disease-wise patient lists
Doctors group patients by condition (`/doctor/diseases`). Lists are created and patients added
**during the consultation** in one click, then browsable any time with age/sex/last-visit and a link
into each patient's profile.

### 3.6 Billing (GST)
- **Consultation invoices**: fee prefilled from doctor, override, discount, GST slab (0/5/12/18%), collected-now or bill-later.
- **Pharmacy bills**: line items from inventory, per-medicine aggregation, all-or-nothing stock deduction with rollback, 12% GST, SALE movements stamped with the billing user.
- **Collect payment**: full or partial (cash/card/UPI) → PARTIALLY_PAID/PAID transitions; balances always 2-dp rounded.
- Branch-scoped lists + detail for receptionists; patient sees/prints own bills; Excel export; printable GST invoice.

### 3.7 Inventory
Add/edit medicines, stock adjust in/out with reason + user stamp, movements log, low-stock banner +
simulated WhatsApp/email alert, soft deactivate, Excel export.

### 3.8 Masters
Departments, specializations, medicine categories, lab tests, investigations, suppliers, tax rates
(+ read-only consultation fees derived from doctors): add / edit / activate–deactivate.

### 3.9 Staff & branches
Branches, doctors (multi-branch assignment, fee, registration no., qualifications), receptionists:
create / edit / soft deactivate — deactivating a doctor never touches their appointment history.

### 3.10 Notifications
In-app notification centre per role; mark one/all read; simulated WhatsApp/email/SMS sends recorded
as notification rows (appointment reminder, low stock, payment received, expiry warning).

### 3.11 Audit log
Every mutation (create/update/status change/sign) appends an audit row: actor, role, action, entity,
summary, timestamp. Date filter + export.

### 3.12 Other implemented modules
Dashboards ×4 roles (KPIs, revenue/appointment charts, today's schedule, activity) · Reports + Analytics ·
Insurance/TPA registry · Doctor roster & leave · Dark/light theme · Collapsible sidebar ·
Global responsive layout (375px+).

**Consent workflow**: reception fills the form (title, consent text, clinical/basic info) from
presets and **assigns the treating doctor**; the assigned doctor sees it under `/doctor/consent` and
can **edit** the wording or clinical details; the patient reviews and **e-signs** on the portal.
A signed form locks (no further edits), signing is audit-logged, and a doctor can only edit forms
assigned to them.

## 4. Non-functional requirements

| Concern | Requirement | Current state |
|---|---|---|
| Performance | Route JS ≤ ~210 kB first load; heavy libs lazy | xlsx + recharts load on demand; largest route 207 kB |
| Responsiveness | Usable at 375px; touch targets ≥ 36-40px on touch devices | verified; `pointer-coarse` sizing |
| Consistency | Money 2-dp rounded at every computation; fixed clinic timezone rendering (Asia/Kolkata) | implemented |
| Security | RBAC 3 layers; scoped reads (branch/patient); no clinical deletes; audit trail | implemented (demo auth) |
| Data integrity | All-or-nothing stock deduction; clash-checked scheduling; soft deletes | implemented |
| Scalability | Storage port abstraction; per-branch scoping on every query | MongoDB adapter pending |
| Quality gates | `tsc --noEmit`, ESLint, Vitest (34 tests), production build | all green |

## 5. Acceptance criteria (samples)

- *Doctor consults in <2 min*: from queue → template click → Save & Complete = 3 interactions; verified.
- *Same medicine on two bill lines cannot oversell stock*: quantities aggregate before validation; rollback on partial failure.
- *A patient cannot sign another patient's consent, view another patient's invoice, or book for someone else*: enforced server-side.
- *A receptionist cannot open another branch's invoice by URL*: scoped `getInvoice` returns 404.
- *Deactivated staff/patients/medicines disappear from pickers but keep history.*

## 6. Out of scope for this release (roadmap → [05-roadmap.md](05-roadmap.md))
Real auth (email/OTP/Google) · MongoDB persistence (adapter guide ready) · real WhatsApp/SMS/email ·
server PDF generation · S3 uploads · multi-language (English/Marathi/Hindi) · pharmacy/lab modules ·
insurance claims workflow · patient mobile app · referral analytics dashboards (data model ready).
