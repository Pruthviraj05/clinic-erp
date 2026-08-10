# Pending list — Clinicore (Dr. Bhosikar's Rheumatology Clinic)

Last updated after a full end-to-end audit: all 56 routes exercised across all
four roles, plus a bug hunt and a scale audit of the data layer.

Legend — **[YOU]** needs a decision or information from you · **[DEV]** is code
work I can pick up whenever you want it.

---

## 1. Blocking go-live

### 1.1 MongoDB Atlas is unreachable **[YOU]**
The cluster has been refusing TLS connections all session (`SSL alert number
80`). It worked earlier in the day, so most likely the free-tier cluster
auto-paused, or this machine's IP dropped off the Atlas allowlist.

- Check **Atlas → Cluster** — resume it if paused.
- Check **Atlas → Network Access** — allowlist your IP (or `0.0.0.0/0` while testing).
- Also allowlist Vercel's egress, or the deployed site cannot connect either.

Everything below that touches MongoDB is blocked on this.

### 1.2 Set the Vercel environment variables **[YOU]**
Project Settings → Environment Variables, then redeploy:

| Variable | Value |
|---|---|
| `MONGODB_URI` | the direct (non-SRV) connection string in your local `.env.local` |
| `NEXT_PUBLIC_DATA_MODE` | `mongodb` |
| `NEXT_PUBLIC_AUTH_MODE` | `credentials` |
| `SESSION_SECRET` | the value in your local `.env.local` |

`NEXT_PUBLIC_AUTH_MODE=credentials` also switches off the dev login (see 1.4) —
do not skip it.

### 1.3 Run the setup scripts once Atlas is reachable **[YOU]**

Indexes first — without them every lookup, including login, scans the whole
collection. All three are safe to re-run.

```bash
node --env-file=.env.local scripts/ensure-indexes.mjs
```

```bash
node --env-file=.env.local scripts/seed-mongodb.mjs
```

```bash
node --env-file=.env.local scripts/backfill-batches.mjs
```

The third one only matters if you already have live stock in MongoDB. Stock is
now held per batch, so any medicine carrying a quantity but no batch rows
cannot be dispensed until it has one — the backfill creates an "OPENING" lot
for each. It prints what it did and skips anything already batched.

### 1.4 Change the admin password at first login **[YOU]**
Ships as `admin@gmail.com` / `Test@12345`. The app now **forces** this — the
first sign-in redirects to a change-password screen and nothing else is
reachable until it is done. New passwords must be at least 12 characters.

### 1.5 Turn on Vercel Deployment Protection **[YOU]** — the real lock-down
You asked that nobody be able to reach this application. That cannot be done
in application code: code can only decide what happens *after* a request
arrives. The perimeter is a Vercel setting.

**Vercel → Project → Settings → Deployment Protection**, then either:
- **Password Protection** — one shared password in front of the whole site, or
- **Vercel Authentication** — only your Vercel team members can load it.

Both sit in front of the app, so the login page is not even visible to the
public internet. Production-domain protection needs a Pro plan.

Optionally also **Vercel Firewall → IP allowlist**, restricted to the clinic's
static IP. That blocks remote/mobile access, so only do it if the clinic works
from one location.

### 1.6 Lock down MongoDB Atlas **[YOU]**
- **Network Access** must not be `0.0.0.0/0`. Vercel's egress IPs are dynamic,
  so the correct answer is a **Private Endpoint / VPC Peering** (M10+), not a
  wide allowlist.
- The current connection string uses `authSource=admin` — create a
  **least-privilege database user** scoped to the `clinicore` database only.
- **Rotate the credentials** in `.env.local`. They have been sitting in
  plaintext on a developer machine.

---

## 2. Clinic details still using placeholders **[YOU]**

Everything here renders on prescriptions, invoices and the portal, so it is worth
getting right before patients see it. Search the codebase for `PLACEHOLDER`.

- Clinic phone, email, GST number
- Dr. Bhosikar's Maharashtra Medical Council registration number
- Exact qualifications (currently "MBBS, MD (Rheumatology)")
- Consultation fee (currently ₹0 — invoices will be ₹0 until set)
- Weekly consulting hours (currently indicative, in `weeklyRoster`)
- Lab-test prices for the rheumatology panel
- Real medicine suppliers, if you want them in Masters

---

## 3. Known gaps — features that look finished but are not **[DEV]**

These are wired to the UI but do nothing yet. Listed so nobody is surprised mid-clinic.

| Screen | What is fake |
|---|---|
| Settings → General / WhatsApp / Email / Notifications | "Save changes" only shows a toast; the fields are not stored. **Only the Prescription tab actually saves.** |
| Roster & Leave | "Request leave" and admin Approve/Reject are simulated; leave never blocks a booking |
| Reports | All 18 PDF/Excel/CSV export buttons are stubs (the inventory/table exports elsewhere are real) |
| Prescription detail | "Share on WhatsApp" and "Download PDF" do nothing — the doctor may believe the patient received it |
| Invoice detail | Share / Download likewise |
| Insurance & TPA | "Add plan" does nothing |

**Recommendation:** either build these or hide the buttons. A button that
silently does nothing is worse than an absent one, especially "Share prescription".

---

## 4. Bugs found and fixed this session (no action needed)

Recorded so you know what changed.

**Security — all confirmed, all fixed**
1. `/dev-login` was a live, password-free admin backdoor reachable in production. Now disabled outside development and whenever real credentials are on.
2. A patient using the global search saw **every other patient's** prescriptions, diagnoses and drug lists.
3. Any doctor could open and edit **another doctor's** prescriptions.
4. A doctor could file a prescription against another doctor's appointment — under that doctor's name, on a medico-legal record.
5. Any doctor could mark another doctor's appointments no-show, or move their slots.
6. Deactivating a doctor or receptionist did **not** revoke their login. A dismissed receptionist could still sign in the next morning.
7. Changing a staff member's email locked them out (login matches a separate record); changing a receptionist's branch left them seeing the old branch's data.
8. Patient portal lists failed **open** — an account with a missing patient link was served the entire clinic's prescriptions and invoices. Scoping now fails closed everywhere.

**Money**
9. The pharmacy dialog labelled the pre-GST subtotal as "Total". Reception quoted and collected 12% less than the invoice recorded as paid — the drawer was short on **every** pharmacy bill. The dialog now shows subtotal, GST and total from the same constant the server uses.
10. Invoice numbers were derived from a row count: two receptionists billing simultaneously got the **same invoice number**, and deleting an invoice made the next one reuse an existing number. Now an atomic counter.
11. After generating a pharmacy bill, reopening the dialog came back pre-filled with the medicines just dispensed — one more click double-charged the patient and double-deducted stock.

**Data integrity**
12. Record IDs were `Date.now()`-based, and audit/template/disease IDs came from per-instance counters that restart at 100 on every serverless cold start. Duplicates were being accepted silently — including in the audit trail. All IDs are now UUID-based, and unique indexes make any residual collision fail loudly.
13. Dashboard "Recent activity" showed the six **oldest** audit entries forever, because an append-ordered log was sliced from the front.
14. The patient portal 500'd outright if the account's patient record was missing. It now explains the problem instead.

---

## 4b. Security hardening added

**Login**
- **Brute force is now blocked.** There was none at all before. An account
  locks for 15 minutes after 5 failed attempts, and there is a separate
  per-IP cap so one password cannot be sprayed across many accounts.
- **Failure messages no longer reveal whether an email exists** — that was a
  free way to enumerate real staff accounts.
- **Staff temp passwords used `Math.random()`**, a predictable generator whose
  internal state can be recovered from a few outputs. Every doctor and
  receptionist password was generated that way. Now cryptographically random.
- **Password hashing strengthened** from Node's default cost to OWASP's
  memory-constrained profile (~200 ms/hash instead of ~25 ms). The cost is now
  stored inside the hash, so it can be raised again later, and existing
  passwords are upgraded automatically on next sign-in.
- **Password minimum raised to 12 characters.** The old rule accepted
  `password1`.
- **Issued passwords must be changed at first sign-in** — seed admin,
  admin-created accounts, and auto-created staff accounts.

**Sessions**
- **Sessions used to last forever and could not be revoked.** The cookie was a
  plain function of the user id, and signing out only deleted the local copy —
  a copied cookie stayed valid indefinitely. Tokens now expire after 12 hours
  and carry a version that is bumped on sign-out, password change and
  deactivation, which kills every existing session immediately.
- Cookies now set `secure` in production.

**Transport & browser**
- **All security headers added** (there were none): HSTS, Content-Security-Policy
  with `frame-ancestors 'none'`, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, plus `no-store` so patient data is never
  cached by an intermediary. The framework banner header is removed.
- **TLS to MongoDB is enforced in code**, so it cannot be silently dropped by
  editing a connection string.

**Input**
- **Uploads are validated server-side** — type and size. Previously only the
  browser checked, and a signature had no size limit at all, so an
  authenticated caller could POST an arbitrary multi-megabyte blob.
- **A patient could create a consent form naming another patient**; now blocked.
- **Notification read-state accepted any ID from any user**; now ownership-checked.

## 4c. Inventory rebuilt around batches

Modelled on how eVitalRx (and any real pharmacy system) handles stock.

**Stock is now held per batch, not as one number.** Each lot carries its own
batch number, expiry, purchase price and MRP. This is what makes the rest
possible — expiry belongs to a lot, a recall targets a lot, and cost varies
between purchases.

- **Dispensing is FEFO** (first-expiry-first-out): the lot closest to expiry
  goes out first, which is what minimises write-offs. The pharmacy bill shows
  which batch will be dispensed, so the person at the counter can check it
  against the box they are taking off the shelf.
- **Receive stock** screen replaces the old "+50 units" adjustment: medicine,
  batch, expiry, quantity, free scheme units, purchase price, MRP, supplier and
  bill number, with an optional photo of the bill. It shows the resulting
  margin live and warns if you would be selling at a loss. Free units correctly
  lower the effective per-unit cost rather than being ignored.
- **Batches tab** — every lot, nearest expiry first, with quantity remaining
  against quantity received, cost, MRP, supplier and bill.
- **Expiry tab** — everything expiring within 90 days, colour-coded by
  urgency. This is the window in which distributors still accept returns.
- **Stock movements now record the lot**, so a recall can be traced to the
  patients who received that batch.
- **Stock value is now real** — valued at actual purchase cost, with retail
  value and margin alongside. Previously there was no cost price at all, so
  the clinic had no visibility of profit.
- **GST is per medicine.** It was hardcoded at 12% for everything; pharma spans
  5/12/18%, so the old flat rate both mis-billed patients and under-reported
  tax. Supplements are now correctly at 5%.
- Medicines also gained **rack location** (so staff can find the box),
  **schedule H/H1/X** (prescription-only classification under the Drugs and
  Cosmetics Rules) and **HSN code** for GST filing.

Not copied from eVitalRx, deliberately: distributor ledgers, purchase orders,
gate passes and e-invoicing are wholesale-pharmacy concerns and would be
clutter in a single-doctor clinic.

## 5. Performance and scale

### Done this session
- **Indexes** — `scripts/ensure-indexes.mjs` covers every real query pattern. There were **none at all** before, so even fetching one record by ID scanned the entire collection.
- **Patient chart** was pulling four entire collections (appointments, prescriptions, invoices, records) to display ~40 rows. Now indexed, sorted, bounded queries.
- **Notification badge** re-fetched the whole notifications collection on *every page render, for every user*. Now a count query.
- **Login** loaded every user account (and every password hash) into memory on each attempt. Now an indexed lookup.
- **Patient search** fetched all patients and filtered in Node. Now a database query.
- **"Mark all read"** did one round-trip per notification (500 unread = 500 sequential writes). Now two bulk updates.
- **Blob fields** (bill photos, uploaded documents, signatures) are stored inline as base64 and were being pulled into every list query — a few hundred stock movements with photos would have exhausted the server's memory. They are now excluded from list reads and fetched only on detail screens.
- **Connection pool** reduced to 5 per instance; Vercel runs many instances and Atlas caps total connections, so a large per-instance pool is what causes a cold-start burst to fail.

### Still worth doing before heavy use **[DEV]**
Ordered by impact. None is urgent at current data volumes.

1. **Dashboards still pull several full collections per render.** The heaviest remaining hot path. Should become counts and date-bounded aggregations. *(Biggest remaining win.)*
2. **Audit log page loads every row**, sorts in Node, and ships them all to the browser. Needs server-side pagination — it will hang the tab first, around ~30k rows.
3. **Global search scans several collections per query.** Should be indexed queries; consider Atlas Search later.
4. **Tables paginate in the browser**, so the whole result set is sent to the client. Fine for hundreds of rows, not for tens of thousands — needs server-side pagination.
5. **Appointment booking** does two full scans per booking, and slot-clash checking is not atomic: two receptionists can double-book the same slot. Needs a partial unique index.
6. **Token numbers and MRNs** are still derived from counts, so they can duplicate under concurrency (same class of bug as the invoice number, already fixed). Should move to the same atomic counter.
7. **Uploads should move to real file storage** (S3 / Vercel Blob) rather than base64 inside documents.

---

## 6. Correctness issues not yet fixed **[DEV]**

Real, reproducible, but lower blast radius than section 4.

1. **Timezone.** Appointment times are parsed in the *server's* timezone but displayed in IST. On Vercel (UTC) a 09:00 booking renders as 2:30 PM. This also shifts "today's" boundaries for early-morning and late-evening appointments. **Worth fixing before real bookings** — I left it because the fix touches every date path and deserves its own careful pass.
2. **A multi-branch doctor's dashboard hides most of their data** — dashboard filters on one branch while the appointments page does not, so the two disagree. Harmless with one branch today.
3. **Receptionists can see Prescriptions and Records tabs** on a patient's profile, which the permission matrix says they should not.
4. **Calendar month navigation skips a month** when the current date is the 29th–31st.
5. **Calendar buckets appointments by browser timezone** but labels them in IST — same root cause as (1).
6. **A patient can create a consent form naming another patient.** They cannot sign it, but it lands in a doctor's queue.
7. **Notification "mark as read" accepts any ID** from any signed-in user.
8. **Saving a consult as a template always drops the follow-up interval.**
9. **Several dialogs keep stale state** after cancel/reopen (e.g. the new-invoice dialog keeps the previous doctor's fee).
10. **Doctor roster matches on display name** rather than ID — a rename silently empties their leave list.
11. **Reception dashboard quick-action tiles** link to `?new=1`, which only the patient portal implements. Three of four tiles appear to do nothing.
12. **Consult screen reads lab tests/investigations from the demo file**, not the database — master data an admin adds will not appear there in MongoDB mode.

---

## 6b. Security work still outstanding **[DEV]**

Ordered by value. None of these is a live hole; they are depth.

1. **Two-factor authentication for admin accounts.** The single highest-value
   remaining item, and the usual expectation for medical records.
2. **Rate limiting is per-server-instance.** It uses in-memory counters, so an
   attacker spread across many cold starts gets more attempts than the nominal
   limit. A shared store (Upstash/Redis, or a Mongo TTL collection) makes the
   limit exact. Account lockout is unaffected — that one is stored in the database.
3. **Nothing is encrypted at the application layer.** Atlas encrypts at rest
   automatically, which covers disk theft — but anyone holding the connection
   string reads everything in plaintext. Options, in order of cost:
   least-privilege DB user (do this regardless); AES-GCM on non-searchable
   fields like notes and uploaded files; Atlas Queryable Encryption for
   searchable fields such as name and phone — note that this **breaks the
   current name/phone search**, which is why I did not do it unilaterally.
4. **The audit log is not tamper-evident.** No code path edits it, but nothing
   structurally prevents it. A hash chain would make any later edit detectable.
5. **Uploads should move to real file storage** rather than base64 inside
   documents, with signed time-limited URLs.
6. **India DPDP Act** (medical records = sensitive personal data): privacy
   notice and consent at registration — the existing consent module is
   *clinical procedure* consent, not data-processing consent — plus a
   retention schedule, patient access/erasure requests, a breach runbook, and
   confirmation that the Atlas cluster is in an Indian region.

## 7. Not started

- 2FA (see 6b.1)
- Cancel/void an invoice (nothing can currently reverse a pharmacy bill, so stock cannot be restored)
- Real WhatsApp/email sending (all notifications are in-app simulations)
- OCR for supplier bill photos — currently the photo is stored as a reference document only; quantities are typed or imported from CSV
- Backups / retention policy for the audit log, which grows forever

---

## Verification status

- 114 automated tests passing (17 files), including regression tests for every scoping fix and the login hardening
- TypeScript, ESLint and the production build are clean
- All 56 routes return 200 for every role
