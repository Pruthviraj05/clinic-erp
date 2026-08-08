import "server-only";
import {
  appointments,
  branches,
  doctors,
  invoices,
  patients,
  prescriptions,
  receptionists,
} from "@/server/demo/data";
import {
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
import type { EntityStore, StoragePort } from "./storage-port";

/**
 * Demo adapter: wraps the module-level demo arrays behind the storage port.
 * Mutations happen in place on the SAME array instances the legacy services
 * read, so both access paths always agree. Data lives for the life of the dev
 * process — intentional for demo mode.
 */

function arrayStore<T extends { id: string }>(rows: T[]): EntityStore<T> {
  return {
    async list(filter) {
      return filter ? rows.filter(filter) : rows.slice();
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

export const demoAdapter: StoragePort = {
  patients: arrayStore(patients),
  appointments: arrayStore(appointments),
  prescriptions: arrayStore(prescriptions),
  invoices: arrayStore(invoices),
  branches: arrayStore(branches),
  doctors: arrayStore(doctors),
  receptionists: arrayStore(receptionists),
  medicalRecords: arrayStore(medicalRecords),
  masters,
};
