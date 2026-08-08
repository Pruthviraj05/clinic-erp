# Clinicore — Permission Matrix

Source of truth: `src/lib/rbac.ts` (`PERMISSIONS`). Rendered live at **Admin → Roles & Access**.
Actions: **V**iew · **C**reate · **E**dit · **D**elete · e**X**port · **P**rint. `—` = no access.

| Module | Admin | Doctor | Receptionist | Patient |
|---|---|---|---|---|
| Dashboard | V X | V | V | V |
| Branches | V C E D X P | — | — | — |
| Doctors | V C E D X P | — | — | — |
| Receptionists | V C E D X P | — | — | — |
| Patients | V C E D X P | V E | V C E X P | — |
| Appointments | V C E X P | V E X | V C E X P | V C |
| Prescriptions | V X P | V C E X P | — | V P |
| EMR / Records | V X P | V C E P | — | V P |
| Billing | V C E D X P | — | V C E X P | V P |
| Inventory | V C E D X P | — | — | — |
| Masters | V C E D X P | — | — | — |
| Reports | V X | — | — | — |
| Analytics | V X | — | — | — |
| Calendar | V | V | V | — |
| Notifications | V C | V | V | V |
| Consent | V C X P | V E P | V C E P | V C P |
| Insurance | V C E D X P | — | — | — |
| Roster & Leave | V C E D | V C E | — | — |
| Settings | V E | — | — | — |
| Roles & Access | V E | — | — | — |
| Audit Log | V X | — | — | — |

**Enforcement layers**
1. `src/middleware.ts` — section-level 307 redirects at the edge.
2. `authorize(module, action)` — inside **every** server action (returns a friendly `ActionResult` failure).
3. `requirePermission(module, action)` — page-level guard where a page exceeds its section's implied access.
4. UI gating — pages pass `can(role, module, action)` booleans into client views; buttons the role
   can't use are not rendered.

**Domain rules encoded in the matrix**
- Clinical records (prescriptions, EMR) have **no delete for anyone** — medico-legal trail.
- Appointments have no delete — cancellation is a status, preserving no-show/cancellation analytics.
- "Delete" on operational modules is a **soft deactivate** (row keeps history, disappears from pickers).
- Patients: self-scoped reads enforced server-side on top of the matrix (own invoices, own consent, self-booking).
- Consent: reception creates and assigns; the **assigned** doctor may edit (ownership checked in the
  action, not just the matrix); a signed form is immutable for everyone.
- Prescriptions: doctors hold `edit` for revisions but nobody holds `delete`.

**Future**: real auth activates the Role/Permission tables in the schema; `PERMISSIONS` becomes the
seed and custom roles (Billing Staff, Accountant, Pharmacist, Lab Staff) are rows, not code.
