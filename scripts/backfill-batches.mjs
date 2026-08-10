// Backfill: give every medicine that already holds stock an opening batch.
//
// Stock used to be a single number on the medicine. It is now held per lot
// (`medicine_batches`), and dispensing draws from those lots — so a medicine
// carrying stockQty with no batch rows cannot be dispensed at all. This
// creates one "opening stock" lot per such medicine so existing inventory
// stays usable after the upgrade.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-batches.mjs
//
// Safe to re-run: medicines that already have batches are skipped. Run it
// once after deploying the batch feature.
import { MongoClient } from "mongodb";
import { randomUUID as uuid } from "node:crypto";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/backfill-batches.mjs");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db("clinicore");
  const medicines = db.collection("medicines");
  const batches = db.collection("medicine_batches");
  const movements = db.collection("stock_movements");

  const all = await medicines.find({}, { projection: { _id: 0 } }).toArray();
  const now = new Date().toISOString();

  let created = 0;
  let skipped = 0;
  let noStock = 0;

  for (const med of all) {
    const existing = await batches.countDocuments({ medicineId: med.id });
    if (existing > 0) {
      skipped += 1;
      continue;
    }
    if (!med.stockQty || med.stockQty <= 0) {
      noStock += 1;
      continue;
    }

    const batch = {
      id: `bat_${uuid()}`,
      medicineId: med.id,
      medicineName: med.name,
      // Flagged rather than invented: we genuinely do not know the real batch
      // number for pre-existing stock, and a made-up one would be worse than
      // an honest placeholder during a recall.
      batchNo: "OPENING",
      expiry: med.nearestExpiry ?? null,
      quantity: med.stockQty,
      receivedQty: med.stockQty,
      costPrice: med.costPrice ?? 0,
      mrp: med.mrp ?? med.sellPrice ?? 0,
      supplierName: null,
      purchaseBillNo: null,
      receivedAt: now,
      receivedBy: "Migration",
    };
    await batches.insertOne(batch);
    await movements.insertOne({
      id: `mv_${uuid()}`,
      medicineId: med.id,
      medicineName: med.name,
      type: "IN",
      quantity: med.stockQty,
      balanceAfter: med.stockQty,
      reason: "Opening stock carried over from before batch tracking",
      by: "Migration",
      at: now,
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiry: batch.expiry,
    });
    created += 1;
  }

  console.log(`Backfill complete.`);
  console.log(`  ${created} medicine(s) given an opening batch`);
  console.log(`  ${skipped} already had batches (skipped)`);
  console.log(`  ${noStock} had no stock (nothing to carry over)`);
  if (created > 0) {
    console.log(`\nThese lots are marked batch "OPENING" with no supplier — correct them as`);
    console.log(`real stock is received, so recalls and expiry checks have accurate data.`);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
