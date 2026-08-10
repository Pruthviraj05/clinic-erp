import "server-only";
import {
  appointments,
  branches,
  daysFromNow,
  doctors,
  invoices,
  medicines,
  notifications,
  patients,
  prescriptions,
  receptionists,
} from "@/server/demo/data";
import {
  consentForms,
  departments,
  investigations,
  labTests,
  medicalRecords,
  medicineCategories,
  specializations,
  suppliers,
  taxRates,
  type MasterRow,
} from "@/server/demo/extra";
import { SEED_RX_TEMPLATES } from "@/server/demo/template-store";
import { ADMIN_SEED_USER, SEED_LOGIN_ACCOUNTS } from "@/server/demo/users-store";
import { prescriptionTemplate } from "@/server/demo/settings-store";
import type { RxTemplate } from "@/server/demo/template-store";
import type { DiseaseGroup } from "@/server/demo/disease-store";
import type { RxDesign } from "@/server/demo/rx-design-store";
import type { UserAccount } from "@/server/demo/users-store";
import type { AuditRow } from "@/server/demo/extra";
import type {
  CounterStore,
  EntityStore,
  FindOptions,
  Query,
  SingletonStore,
  StoragePort,
} from "./storage-port";
import type { MedicineBatch, StockMovementItem } from "@/types/domain";

/**
 * Demo adapter: wraps module-level in-memory arrays behind the storage port.
 * Mutations happen in place, so both access paths always agree. Data lives
 * for the life of the dev process — intentional for demo mode.
 */

/**
 * Interprets the subset of MongoDB query syntax this app actually uses, so
 * the demo adapter behaves like the real one. Supports equality plus
 * `$ne / $gte / $gt / $lte / $lt / $in / $regex`, and a top-level `$or`.
 */
function matchesQuery<T>(row: T, query: Query): boolean {
  for (const [key, condition] of Object.entries(query)) {
    if (key === "$or") {
      const branches = condition as Query[];
      if (!branches.some((b) => matchesQuery(row, b))) return false;
      continue;
    }
    const value = (row as Record<string, unknown>)[key];
    if (condition !== null && typeof condition === "object" && !Array.isArray(condition)) {
      const ops = condition as Record<string, unknown>;
      for (const [op, operand] of Object.entries(ops)) {
        switch (op) {
          case "$ne": if (value === operand) return false; break;
          case "$gte": if (!(value !== undefined && (value as never) >= (operand as never))) return false; break;
          case "$gt": if (!(value !== undefined && (value as never) > (operand as never))) return false; break;
          case "$lte": if (!(value !== undefined && (value as never) <= (operand as never))) return false; break;
          case "$lt": if (!(value !== undefined && (value as never) < (operand as never))) return false; break;
          case "$in": if (!(operand as unknown[]).includes(value)) return false; break;
          case "$regex": {
            const re = operand instanceof RegExp ? operand : new RegExp(String(operand), "i");
            if (typeof value !== "string" || !re.test(value)) return false;
            break;
          }
          default: return false;
        }
      }
      continue;
    }
    // MongoDB treats `{ field: null }` as "null OR missing" — match that, so
    // queries behave identically against either adapter.
    if (condition === null) {
      if (value !== null && value !== undefined) return false;
      continue;
    }
    if (value !== condition) return false;
  }
  return true;
}

function applyOptions<T>(rows: T[], options: FindOptions): T[] {
  let out = rows;
  if (options.sort) {
    const entries = Object.entries(options.sort);
    out = [...out].sort((a, b) => {
      for (const [field, dir] of entries) {
        const av = (a as Record<string, unknown>)[field];
        const bv = (b as Record<string, unknown>)[field];
        if (av === bv) continue;
        const cmp = (av as never) > (bv as never) ? 1 : -1;
        return dir === 1 ? cmp : -cmp;
      }
      return 0;
    });
  }
  if (options.skip) out = out.slice(options.skip);
  if (options.limit !== undefined) out = out.slice(0, options.limit);
  return out;
}

function arrayStore<T extends { id: string }>(rows: T[]): EntityStore<T> {
  return {
    async list(filter) {
      return filter ? rows.filter(filter) : rows.slice();
    },
    async find(query = {}, options = {}) {
      return applyOptions(rows.filter((r) => matchesQuery(r, query)), options);
    },
    async count(query = {}) {
      return rows.filter((r) => matchesQuery(r, query)).length;
    },
    async insertMany(newRows) {
      rows.push(...newRows);
      return newRows.length;
    },
    async updateMany(query, patch) {
      let n = 0;
      for (const row of rows) {
        if (matchesQuery(row, query)) {
          Object.assign(row, patch);
          n += 1;
        }
      }
      return n;
    },
    async get(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async insert(row) {
      rows.push(row);
      return row;
    },
    async update(id, patch) {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },
    async remove(id) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      rows.splice(idx, 1);
      return true;
    },
  };
}

const masters: Record<string, EntityStore<MasterRow>> = {
  departments: arrayStore(departments),
  specializations: arrayStore(specializations),
  "medicine-categories": arrayStore(medicineCategories),
  "lab-tests": arrayStore(labTests),
  investigations: arrayStore(investigations),
  suppliers: arrayStore(suppliers),
  "tax-rates": arrayStore(taxRates),
};

/**
 * Sample stock ledger. Balances line up with the opening `stockQty` values in
 * `src/server/demo/data.ts` (med_1 = 140 after a 150 receipt and a 10-unit
 * sale, med_17 = 200, med_19 = 2) so the Movements tab reconciles with the
 * stock list instead of looking empty.
 */
/**
 * Sample lots. Per medicine the batch quantities sum to that medicine's
 * `stockQty` in `src/server/demo/data.ts`, and the earliest expiry among lots
 * still holding stock equals its `nearestExpiry` — so the Stock, Batches and
 * Expiry tabs all reconcile. Four medicines (med_2, med_8, med_10, med_12)
 * carry two lots so FEFO ordering is visible.
 */
const medicineBatchRows: MedicineBatch[] = [
  {
    id: "bat_seed_1",
    medicineId: "med_1",
    medicineName: "Etoricoxib 90mg",
    batchNo: "ETX2431",
    expiry: daysFromNow(210),
    quantity: 140,
    receivedQty: 150,
    costPrice: 8.5,
    mrp: 14,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 15),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_2",
    medicineId: "med_2",
    medicineName: "Diclofenac 50mg",
    batchNo: "DCF8802",
    expiry: daysFromNow(300),
    quantity: 60,
    receivedQty: 60,
    costPrice: 2.9,
    mrp: 4.8,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 20),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_3",
    medicineId: "med_2",
    medicineName: "Diclofenac 50mg",
    batchNo: "DCF9147",
    expiry: daysFromNow(400),
    quantity: 100,
    receivedQty: 100,
    costPrice: 2.75,
    mrp: 4.8,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1246",
    receivedAt: daysFromNow(-12, 11, 30),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_4",
    medicineId: "med_3",
    medicineName: "Aceclofenac 100mg + Paracetamol 325mg",
    batchNo: "ACP5510",
    expiry: daysFromNow(240),
    quantity: 120,
    receivedQty: 120,
    costPrice: 5.6,
    mrp: 9.5,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 20),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_5",
    medicineId: "med_4",
    medicineName: "Methotrexate 7.5mg",
    batchNo: "MTX1209",
    expiry: daysFromNow(180),
    quantity: 60,
    receivedQty: 60,
    costPrice: 10.5,
    mrp: 18,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_6",
    medicineId: "med_5",
    medicineName: "Sulfasalazine 500mg",
    batchNo: "SSZ3364",
    expiry: null,
    quantity: 55,
    receivedQty: 55,
    costPrice: 6.3,
    mrp: 10.5,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_7",
    medicineId: "med_6",
    medicineName: "Hydroxychloroquine 200mg",
    batchNo: "HCQ7721",
    expiry: daysFromNow(330),
    quantity: 48,
    receivedQty: 48,
    costPrice: 7.7,
    mrp: 13,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_8",
    medicineId: "med_7",
    medicineName: "Leflunomide 20mg",
    batchNo: "LEF4408",
    expiry: daysFromNow(270),
    quantity: 40,
    receivedQty: 40,
    costPrice: 15.4,
    mrp: 26,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_9",
    medicineId: "med_8",
    medicineName: "Prednisolone 5mg",
    batchNo: "PRD2290",
    expiry: daysFromNow(150),
    quantity: 30,
    receivedQty: 50,
    costPrice: 2.2,
    mrp: 3.6,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 30),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_10",
    medicineId: "med_8",
    medicineName: "Prednisolone 5mg",
    batchNo: "PRD3115",
    expiry: daysFromNow(290),
    quantity: 60,
    receivedQty: 60,
    costPrice: 2.05,
    mrp: 3.6,
    supplierName: "Nirmal Healthcare Supplies",
    purchaseBillNo: "NHS-0138",
    receivedAt: daysFromNow(-9, 12, 15),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_11",
    medicineId: "med_9",
    medicineName: "Febuxostat 40mg",
    batchNo: "FBX6603",
    expiry: daysFromNow(360),
    quantity: 100,
    receivedQty: 100,
    costPrice: 9.8,
    mrp: 16.5,
    supplierName: "Nirmal Healthcare Supplies",
    purchaseBillNo: "NHS-0092",
    receivedAt: daysFromNow(-14, 11, 0),
    receivedBy: "Admin",
  },
  {
    id: "bat_seed_12",
    medicineId: "med_10",
    medicineName: "Colchicine 0.5mg",
    batchNo: "COL1874",
    expiry: daysFromNow(21),
    quantity: 15,
    receivedQty: 40,
    costPrice: 4.3,
    mrp: 7.2,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4402",
    receivedAt: daysFromNow(-60, 10, 45),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_13",
    medicineId: "med_10",
    medicineName: "Colchicine 0.5mg",
    batchNo: "COL2318",
    expiry: daysFromNow(280),
    quantity: 60,
    receivedQty: 60,
    costPrice: 4.1,
    mrp: 7.2,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1246",
    receivedAt: daysFromNow(-12, 11, 30),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_14",
    medicineId: "med_11",
    medicineName: "Allopurinol 100mg",
    batchNo: "ALP5029",
    expiry: daysFromNow(420),
    quantity: 80,
    receivedQty: 80,
    costPrice: 3.5,
    mrp: 6,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1246",
    receivedAt: daysFromNow(-12, 11, 30),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_15",
    medicineId: "med_12",
    medicineName: "Calcium 500mg + Vitamin D3 250IU",
    batchNo: "CAD3390",
    expiry: daysFromNow(300),
    quantity: 80,
    receivedQty: 100,
    costPrice: 5,
    mrp: 8.4,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 35),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_16",
    medicineId: "med_12",
    medicineName: "Calcium 500mg + Vitamin D3 250IU",
    batchNo: "CAD4102",
    expiry: daysFromNow(420),
    quantity: 100,
    receivedQty: 100,
    costPrice: 4.85,
    mrp: 8.4,
    supplierName: "Nirmal Healthcare Supplies",
    purchaseBillNo: "NHS-0138",
    receivedAt: daysFromNow(-9, 12, 15),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_17",
    medicineId: "med_13",
    medicineName: "Vitamin D3 60000IU",
    batchNo: "VTD7745",
    expiry: daysFromNow(240),
    quantity: 90,
    receivedQty: 90,
    costPrice: 21,
    mrp: 35,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 35),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_18",
    medicineId: "med_14",
    medicineName: "Alendronate 70mg",
    batchNo: "ALN9931",
    expiry: daysFromNow(380),
    quantity: 45,
    receivedQty: 45,
    costPrice: 31.5,
    mrp: 54,
    supplierName: "Nirmal Healthcare Supplies",
    purchaseBillNo: "NHS-0092",
    receivedAt: daysFromNow(-14, 11, 0),
    receivedBy: "Admin",
  },
  {
    id: "bat_seed_19",
    medicineId: "med_15",
    medicineName: "Thiocolchicoside 4mg",
    batchNo: "THC2207",
    expiry: daysFromNow(190),
    quantity: 12,
    receivedQty: 50,
    costPrice: 7,
    mrp: 12,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_20",
    medicineId: "med_16",
    medicineName: "Chlorzoxazone 250mg + Paracetamol 500mg",
    batchNo: "CZP6614",
    expiry: null,
    quantity: 130,
    receivedQty: 130,
    costPrice: 4.2,
    mrp: 7.2,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_21",
    medicineId: "med_17",
    medicineName: "Pantoprazole 40mg",
    batchNo: "PAN4478",
    expiry: daysFromNow(310),
    quantity: 200,
    receivedQty: 200,
    costPrice: 3.5,
    mrp: 6,
    supplierName: "Deccan Medico Agencies",
    purchaseBillNo: "DMA-1180",
    receivedAt: daysFromNow(-30, 10, 25),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_22",
    medicineId: "med_18",
    medicineName: "Folic Acid 5mg",
    batchNo: "FOL1156",
    expiry: daysFromNow(350),
    quantity: 150,
    receivedQty: 150,
    costPrice: 1.4,
    mrp: 2.4,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 35),
    receivedBy: "Priya Kale",
  },
  {
    id: "bat_seed_23",
    medicineId: "med_19",
    medicineName: "Etanercept 25mg Injection",
    batchNo: "ETN0071",
    expiry: daysFromNow(120),
    quantity: 2,
    receivedQty: 2,
    costPrice: 2800,
    mrp: 3600,
    supplierName: "Nirmal Healthcare Supplies",
    purchaseBillNo: "NHS-0092",
    receivedAt: daysFromNow(-14, 11, 0),
    receivedBy: "Admin",
  },
  {
    id: "bat_seed_24",
    medicineId: "med_20",
    medicineName: "Tramadol 37.5mg + Paracetamol 325mg",
    batchNo: "TRP8823",
    expiry: daysFromNow(220),
    quantity: 110,
    receivedQty: 120,
    costPrice: 6.3,
    mrp: 10.8,
    supplierName: "Sahyadri Pharma Distributors",
    purchaseBillNo: "SPD-4471",
    receivedAt: daysFromNow(-30, 10, 35),
    receivedBy: "Priya Kale",
  },
];
const stockMovementsRows: StockMovementItem[] = [
  {
    id: "stk_seed_1",
    medicineId: "med_1",
    medicineName: "Etoricoxib 90mg",
    type: "IN",
    quantity: 150,
    balanceAfter: 150,
    reason: "Opening stock — Sahyadri Pharma Distributors, invoice SPD-4471",
    by: "Priya Kale",
    at: daysFromNow(-30, 10, 15),
    batchId: "bat_seed_1",
    batchNo: "ETX2431",
    expiry: daysFromNow(210),
  },
  {
    id: "stk_seed_2",
    medicineId: "med_17",
    medicineName: "Pantoprazole 40mg",
    type: "IN",
    quantity: 200,
    balanceAfter: 200,
    reason: "Opening stock — Deccan Medico Agencies, invoice DMA-1180",
    by: "Priya Kale",
    at: daysFromNow(-30, 10, 25),
    batchId: "bat_seed_21",
    batchNo: "PAN4478",
    expiry: daysFromNow(310),
  },
  {
    id: "stk_seed_3",
    medicineId: "med_19",
    medicineName: "Etanercept 25mg Injection",
    type: "IN",
    quantity: 2,
    balanceAfter: 2,
    reason: "Cold-chain receipt — Nirmal Healthcare Supplies, invoice NHS-0092",
    by: "Admin",
    at: daysFromNow(-14, 11, 0),
    batchId: "bat_seed_23",
    batchNo: "ETN0071",
    expiry: daysFromNow(120),
  },
  {
    id: "stk_seed_4",
    medicineId: "med_1",
    medicineName: "Etoricoxib 90mg",
    type: "SALE",
    quantity: -10,
    balanceAfter: 140,
    reason: "Dispensed — Ramesh Kulkarni (MRN-100235)",
    by: "Priya Kale",
    at: daysFromNow(-10, 17, 5),
    batchId: "bat_seed_1",
    batchNo: "ETX2431",
    expiry: daysFromNow(210),
  },
];
const auditLogRows: AuditRow[] = [];
const usersRows: UserAccount[] = [ADMIN_SEED_USER, ...SEED_LOGIN_ACCOUNTS];
const rxTemplatesRows: RxTemplate[] = [...SEED_RX_TEMPLATES];
const diseaseGroupsRows: DiseaseGroup[] = [];
const rxDesignsRows: (RxDesign & { id: string })[] = [];

const settingsStore: SingletonStore<typeof prescriptionTemplate> = {
  async get() {
    return prescriptionTemplate;
  },
  async set(value) {
    Object.assign(prescriptionTemplate, value);
    return prescriptionTemplate;
  },
};

const counterValues = new Map<string, number>();
const counterStore: CounterStore = {
  async next(key) {
    const value = (counterValues.get(key) ?? 0) + 1;
    counterValues.set(key, value);
    return value;
  },
  async ensureAtLeast(key, value) {
    if ((counterValues.get(key) ?? 0) < value) counterValues.set(key, value);
  },
};

export const demoAdapter: StoragePort = {
  patients: arrayStore(patients),
  appointments: arrayStore(appointments),
  prescriptions: arrayStore(prescriptions),
  invoices: arrayStore(invoices),
  branches: arrayStore(branches),
  doctors: arrayStore(doctors),
  receptionists: arrayStore(receptionists),
  medicalRecords: arrayStore(medicalRecords),
  medicines: arrayStore(medicines),
  medicineBatches: arrayStore(medicineBatchRows),
  stockMovements: arrayStore(stockMovementsRows),
  notifications: arrayStore(notifications),
  consentForms: arrayStore(consentForms),
  auditLog: arrayStore(auditLogRows),
  users: arrayStore(usersRows),
  rxTemplates: arrayStore(rxTemplatesRows),
  rxDesigns: arrayStore(rxDesignsRows),
  diseaseGroups: arrayStore(diseaseGroupsRows),
  masters,
  settings: settingsStore,
  counters: counterStore,
};
