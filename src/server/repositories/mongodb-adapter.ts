import "server-only";
import type { Collection, Document } from "mongodb";
import { getDb } from "./mongo-client";
import type { CounterStore, EntityStore, SingletonStore, StoragePort } from "./storage-port";
import type { PrescriptionTemplate } from "@/server/demo/settings-store";

/**
 * MongoDB adapter — implements the storage port over real Atlas collections.
 * One collection per entity, keyed by the app-level `id` field (not `_id`,
 * so every document shape matches the demo view-types exactly and nothing
 * downstream has to know it's talking to Mongo).
 *
 * Scale note: `list(filter)` takes a JS predicate (inherited from the demo
 * adapter's in-memory contract) — this fetches the full collection and
 * filters client-side rather than pushing the predicate into a Mongo query.
 * That's the right tradeoff for a single-clinic deployment (tens to low
 * hundreds of rows per collection); if/when data volume grows, hot filters
 * (by patientId, by date range) should get dedicated indexed query methods
 * instead of widening this generic contract.
 */

async function collectionFor<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

function stripId<T>(doc: (T & { _id?: unknown }) | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as T;
}

/**
 * Fields large enough to blow up a list response. Base64 uploads live inline
 * on the document (there is no object storage yet), so a few hundred rows can
 * be gigabytes. They are projected out of every multi-row read and fetched
 * only by `get(id)` on a detail screen.
 */
const BLOB_FIELDS = [
  "billPhotoDataUrl",
  "fileDataUrl",
  "signatureDataUrl",
  "doctorSignatureDataUrl",
  "witnessSignatureDataUrl",
];

function blobProjection(): Record<string, 0> {
  return Object.fromEntries(BLOB_FIELDS.map((f) => [f, 0])) as Record<string, 0>;
}

function mongoStore<T extends { id: string }>(collectionName: string): EntityStore<T> {
  return {
    async list(filter) {
      const col = await collectionFor<T & Document>(collectionName);
      const rows = (await col
        .find({}, { projection: { _id: 0, ...blobProjection() } })
        .toArray()) as T[];
      return filter ? rows.filter(filter) : rows;
    },
    async find(query = {}, options = {}) {
      const col = await collectionFor<T & Document>(collectionName);
      const omit = Object.fromEntries((options.omit ?? []).map((f) => [f, 0]));
      let cursor = col.find(query as never, {
        projection: { _id: 0, ...blobProjection(), ...omit },
      });
      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.skip) cursor = cursor.skip(options.skip);
      if (options.limit) cursor = cursor.limit(options.limit);
      return (await cursor.toArray()) as T[];
    },
    async count(query = {}) {
      const col = await collectionFor<T & Document>(collectionName);
      return col.countDocuments(query as never);
    },
    async insertMany(rows) {
      if (!rows.length) return 0;
      const col = await collectionFor<T & Document>(collectionName);
      const res = await col.insertMany(rows.map((r) => ({ ...r })) as never);
      return res.insertedCount;
    },
    async updateMany(query, patch) {
      const col = await collectionFor<T & Document>(collectionName);
      const res = await col.updateMany(query as never, { $set: patch as never });
      return res.modifiedCount;
    },
    async get(id) {
      const col = await collectionFor<T & Document>(collectionName);
      const doc = await col.findOne({ id } as never, { projection: { _id: 0 } });
      return stripId(doc as (T & { _id?: unknown }) | null);
    },
    async insert(row) {
      const col = await collectionFor<T & Document>(collectionName);
      await col.insertOne({ ...row } as never);
      return row;
    },
    async update(id, patch) {
      const col = await collectionFor<T & Document>(collectionName);
      const result = await col.findOneAndUpdate(
        { id } as never,
        { $set: patch as never },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      return stripId(result as (T & { _id?: unknown }) | null);
    },
    async remove(id) {
      const col = await collectionFor<T & Document>(collectionName);
      const result = await col.deleteOne({ id } as never);
      return result.deletedCount === 1;
    },
  };
}

/** One logical collection ("masters"), discriminated by a `group` field. */
function mastersStoreFor(group: string): EntityStore<import("@/server/demo/extra").MasterRow> {
  type Row = import("@/server/demo/extra").MasterRow & { group: string };
  return {
    async list(filter) {
      const col = await collectionFor<Row>("masters");
      const rows = (await col.find({ group }, { projection: { _id: 0, group: 0 } }).toArray()) as Row[];
      return filter ? rows.filter(filter) : rows;
    },
    async find(query = {}, options = {}) {
      const col = await collectionFor<Row>("masters");
      let cursor = col.find({ ...query, group } as never, { projection: { _id: 0, group: 0 } });
      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.skip) cursor = cursor.skip(options.skip);
      if (options.limit) cursor = cursor.limit(options.limit);
      return (await cursor.toArray()) as Row[];
    },
    async count(query = {}) {
      const col = await collectionFor<Row>("masters");
      return col.countDocuments({ ...query, group } as never);
    },
    async insertMany(rows) {
      if (!rows.length) return 0;
      const col = await collectionFor<Row>("masters");
      const res = await col.insertMany(rows.map((r) => ({ ...r, group })) as never);
      return res.insertedCount;
    },
    async updateMany(query, patch) {
      const col = await collectionFor<Row>("masters");
      const res = await col.updateMany({ ...query, group } as never, { $set: patch as never });
      return res.modifiedCount;
    },
    async get(id) {
      const col = await collectionFor<Row>("masters");
      const doc = await col.findOne({ id, group } as never, { projection: { _id: 0, group: 0 } });
      return stripId(doc as (Row & { _id?: unknown }) | null);
    },
    async insert(row) {
      const col = await collectionFor<Row>("masters");
      await col.insertOne({ ...row, group } as never);
      return row;
    },
    async update(id, patch) {
      const col = await collectionFor<Row>("masters");
      const result = await col.findOneAndUpdate(
        { id, group } as never,
        { $set: patch as never },
        { returnDocument: "after", projection: { _id: 0, group: 0 } },
      );
      return stripId(result as (Row & { _id?: unknown }) | null);
    },
    async remove(id) {
      const col = await collectionFor<Row>("masters");
      const result = await col.deleteOne({ id, group } as never);
      return result.deletedCount === 1;
    },
  };
}

const MASTER_GROUP_KEYS = [
  "departments",
  "specializations",
  "medicine-categories",
  "lab-tests",
  "investigations",
  "suppliers",
  "tax-rates",
];

const settingsStore: SingletonStore<PrescriptionTemplate> = {
  async get() {
    const col = await collectionFor<{ _key: string } & PrescriptionTemplate>("settings");
    const doc = await col.findOne({ _key: "prescriptionTemplate" } as never, { projection: { _id: 0, _key: 0 } });
    if (doc) return doc as unknown as PrescriptionTemplate;
    // No settings document yet — fall back to the built-in defaults and persist them.
    const { prescriptionTemplate } = await import("@/server/demo/settings-store");
    await this.set(prescriptionTemplate);
    return prescriptionTemplate;
  },
  async set(value) {
    const col = await collectionFor<{ _key: string } & PrescriptionTemplate>("settings");
    await col.updateOne(
      { _key: "prescriptionTemplate" } as never,
      { $set: { _key: "prescriptionTemplate", ...value } as never },
      { upsert: true },
    );
    return value;
  },
};

/**
 * Atomic sequences. `findOneAndUpdate` with `$inc` is a single round-trip and
 * a single document write, so two concurrent callers can never receive the
 * same number — unlike deriving one from `collection.length`.
 */
const counterStore: CounterStore = {
  async next(key) {
    const db = await getDb();
    const res = await db
      .collection<{ _id: string; seq: number }>("counters")
      .findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" },
      );
    return res?.seq ?? 1;
  },
  async ensureAtLeast(key, value) {
    const db = await getDb();
    await db
      .collection<{ _id: string; seq: number }>("counters")
      .updateOne({ _id: key, seq: { $lt: value } }, { $set: { seq: value } }, { upsert: false });
    await db
      .collection<{ _id: string; seq: number }>("counters")
      .updateOne({ _id: key }, { $setOnInsert: { seq: value } }, { upsert: true });
  },
};

export const mongodbAdapter: StoragePort = {
  patients: mongoStore("patients"),
  appointments: mongoStore("appointments"),
  prescriptions: mongoStore("prescriptions"),
  invoices: mongoStore("invoices"),
  branches: mongoStore("branches"),
  doctors: mongoStore("doctors"),
  receptionists: mongoStore("receptionists"),
  medicalRecords: mongoStore("medical_records"),
  medicines: mongoStore("medicines"),
  medicineBatches: mongoStore("medicine_batches"),
  stockMovements: mongoStore("stock_movements"),
  notifications: mongoStore("notifications"),
  consentForms: mongoStore("consent_forms"),
  auditLog: mongoStore("audit_log"),
  users: mongoStore("users"),
  rxTemplates: mongoStore("rx_templates"),
  rxDesigns: mongoStore("rx_designs"),
  billDesigns: mongoStore("bill_designs"),
  diseaseGroups: mongoStore("disease_groups"),
  masters: Object.fromEntries(MASTER_GROUP_KEYS.map((g) => [g, mastersStoreFor(g)])),
  settings: settingsStore,
  counters: counterStore,
};
