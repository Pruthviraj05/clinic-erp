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
import { ADMIN_SEED_USER } from "@/server/demo/users-store";
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
import type { StockMovementItem } from "@/types/domain";

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
  },
];
const auditLogRows: AuditRow[] = [];
const usersRows: UserAccount[] = [ADMIN_SEED_USER];
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
