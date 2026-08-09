import "server-only";
import {
  appointments,
  branches,
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
import type { EntityStore, SingletonStore, StoragePort } from "./storage-port";
import type { StockMovementItem } from "@/types/domain";

/**
 * Demo adapter: wraps module-level in-memory arrays behind the storage port.
 * Mutations happen in place, so both access paths always agree. Data lives
 * for the life of the dev process — intentional for demo mode.
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

const stockMovementsRows: StockMovementItem[] = [];
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
};
