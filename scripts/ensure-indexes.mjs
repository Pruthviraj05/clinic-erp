// Creates the indexes the app's query patterns need. Idempotent — MongoDB
// ignores a createIndex for an index that already exists with the same spec.
//
// Usage:
//   node --env-file=.env.local scripts/ensure-indexes.mjs
//
// Run this once per environment, and again after adding new query patterns.
// Without these, EVERY lookup (including get-by-id and login-by-email) is a
// full collection scan.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/ensure-indexes.mjs");
  process.exit(1);
}

/**
 * `unique: true` on `id` is not cosmetic — it is what makes a duplicate id
 * fail loudly instead of silently inserting a second row that shadows the
 * first on every subsequent read.
 */
const INDEXES = {
  patients: [
    [{ id: 1 }, { unique: true }],
    [{ mrn: 1 }, { unique: true }],
    [{ fullName: 1 }],
    [{ phone: 1 }],
  ],
  appointments: [
    [{ id: 1 }, { unique: true }],
    [{ patientId: 1, scheduledStart: -1 }],
    [{ doctorId: 1, scheduledStart: 1 }],
    [{ branchId: 1, scheduledStart: 1 }],
    [{ doctorId: 1, scheduledStart: 1, status: 1 }],
  ],
  invoices: [
    [{ id: 1 }, { unique: true }],
    [{ number: 1 }, { unique: true }],
    [{ patientId: 1, createdAt: -1 }],
    [{ branchId: 1, createdAt: -1 }],
  ],
  prescriptions: [
    [{ id: 1 }, { unique: true }],
    [{ patientId: 1, createdAt: -1 }],
    [{ doctorId: 1, createdAt: -1 }],
    [{ followUpDate: 1 }],
  ],
  users: [
    [{ id: 1 }, { unique: true }],
    [{ email: 1 }, { unique: true }],
    [{ linkId: 1 }],
  ],
  audit_log: [
    [{ id: 1 }, { unique: true }],
    [{ at: -1 }],
  ],
  notifications: [
    [{ id: 1 }, { unique: true }],
    [{ read: 1, recipientId: 1 }],
    [{ createdAt: -1 }],
  ],
  medical_records: [
    [{ id: 1 }, { unique: true }],
    [{ patientId: 1, recordedAt: -1 }],
  ],
  consent_forms: [
    [{ id: 1 }, { unique: true }],
    [{ patientId: 1 }],
    [{ doctorId: 1 }],
  ],
  stock_movements: [
    [{ id: 1 }, { unique: true }],
    [{ medicineId: 1, at: -1 }],
    [{ at: -1 }],
  ],
  medicines: [
    [{ id: 1 }, { unique: true }],
    [{ isActive: 1, stockQty: 1 }],
    [{ name: 1 }],
  ],
  doctors: [[{ id: 1 }, { unique: true }]],
  branches: [[{ id: 1 }, { unique: true }]],
  receptionists: [[{ id: 1 }, { unique: true }]],
  rx_templates: [[{ id: 1 }, { unique: true }], [{ doctorId: 1 }]],
  rx_designs: [[{ id: 1 }, { unique: true }]],
  disease_groups: [[{ id: 1 }, { unique: true }], [{ doctorId: 1 }]],
  masters: [[{ group: 1, id: 1 }, { unique: true }]],
};

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db("clinicore");

  let created = 0;
  let skipped = 0;
  for (const [collection, specs] of Object.entries(INDEXES)) {
    for (const [keys, options = {}] of specs) {
      try {
        await db.collection(collection).createIndex(keys, options);
        created += 1;
      } catch (err) {
        // A unique index fails if the collection already holds duplicates.
        // Report it rather than aborting — the duplicates need a human.
        console.warn(`  ! ${collection} ${JSON.stringify(keys)} — ${err.message.split("\n")[0]}`);
        skipped += 1;
      }
    }
    console.log(`Indexed: ${collection}`);
  }

  console.log(`\nDone. ${created} index(es) ensured${skipped ? `, ${skipped} skipped (see warnings above)` : ""}.`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
