# Repositories — storage port & adapters

The write/read facades (`src/server/actions/*`, `src/server/services/*`) reach
persistence through the **storage port** (`storage-port.ts`), exported as `db`
from `index.ts`. The active adapter is the in-memory demo store.

## Plugging in MongoDB (planned backend)

1. `npm install mongodb` (or `mongoose`).
2. Create `mongodb-adapter.ts` implementing `StoragePort`. Each `EntityStore<T>`
   maps 1:1 onto a collection:

   | Store            | Collection        | Notes                                       |
   |------------------|-------------------|---------------------------------------------|
   | `patients`       | `patients`        | keep app-generated string `id` (indexed, unique) or map `_id` ↔ `id` |
   | `appointments`   | `appointments`    | index `{ doctorId, scheduledStart }`, `{ branchId, scheduledStart }` |
   | `prescriptions`  | `prescriptions`   | medicines embedded as a sub-array (document model fits directly) |
   | `invoices`       | `invoices`        | items embedded; amounts stored as numbers (paise) or `Decimal128` |
   | `branches`       | `branches`        |                                             |
   | `doctors`        | `doctors`         |                                             |
   | `receptionists`  | `receptionists`   |                                             |
   | `medicalRecords` | `medical_records` | file payloads belong in object storage (S3/GridFS), row keeps the pointer |
   | `masters.<key>`  | `masters`         | one collection with a `group` field, or one per group |

3. Method mapping is mechanical:
   - `list(filter?)` → `collection.find(query)` (translate the hot filters to
     real Mongo queries + indexes rather than post-filtering in JS)
   - `get(id)` → `findOne({ id })`
   - `insert(row)` → `insertOne(row)`
   - `update(id, patch)` → `findOneAndUpdate({ id }, { $set: patch }, { returnDocument: "after" })`
   - `remove(id)` → `deleteOne({ id })` — aggregates prefer soft-delete via
     `update(id, { isActive: false })`, which the actions already do.
4. Export the adapter from `index.ts` (switch on `appConfig.dataMode`), set
   `MONGODB_URI` in `.env`, and set `NEXT_PUBLIC_DATA_MODE=mongodb`.
5. Multi-tenancy: every query must be scoped by `organizationId` (and
   `branchId` where relevant) once real auth lands — the demo dataset is
   single-org so the port omits it today; add the field to the filters, not to
   the call sites.

Domain view-types stay the single contract (`src/types/domain.ts`) — the UI
never sees driver documents.

## Inventory

Medicines + stock movements live in `src/server/demo/inventory-store.ts`
because deduction/adjustment is domain logic (balance math, movement log),
not plain CRUD. Port that module as a service over two collections
(`medicines`, `stock_movements`) using a Mongo transaction for
validate-then-deduct.
