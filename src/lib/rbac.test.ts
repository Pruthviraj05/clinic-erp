import { describe, it, expect } from "vitest";
import { can, canAccess, PERMISSIONS, ROLES, ROLE_HOME, ROLE_MODULES } from "./rbac";

describe("RBAC", () => {
  it("grants admin access to every module", () => {
    for (const m of ROLE_MODULES.ADMIN) expect(canAccess("ADMIN", m)).toBe(true);
    expect(canAccess("ADMIN", "billing")).toBe(true);
    expect(canAccess("ADMIN", "audit")).toBe(true);
  });

  it("denies doctors finance & admin modules", () => {
    expect(canAccess("DOCTOR", "billing")).toBe(false);
    expect(canAccess("DOCTOR", "inventory")).toBe(false);
    expect(canAccess("DOCTOR", "masters")).toBe(false);
    expect(canAccess("DOCTOR", "prescriptions")).toBe(true);
  });

  it("scopes receptionist to front-desk modules", () => {
    expect(canAccess("RECEPTIONIST", "billing")).toBe(true);
    expect(canAccess("RECEPTIONIST", "appointments")).toBe(true);
    expect(canAccess("RECEPTIONIST", "masters")).toBe(false);
    expect(canAccess("RECEPTIONIST", "analytics")).toBe(false);
  });

  it("limits patients to their own data modules", () => {
    expect(canAccess("PATIENT", "prescriptions")).toBe(true);
    expect(canAccess("PATIENT", "patients")).toBe(false);
    expect(canAccess("PATIENT", "reports")).toBe(false);
  });

  it("maps each role to a home route", () => {
    expect(ROLE_HOME.ADMIN).toBe("/admin");
    expect(ROLE_HOME.DOCTOR).toBe("/doctor");
    expect(ROLE_HOME.RECEPTIONIST).toBe("/reception");
    expect(ROLE_HOME.PATIENT).toBe("/portal");
  });
});

describe("granular permissions", () => {
  it("lets doctors author prescriptions but never delete clinical records", () => {
    expect(can("DOCTOR", "prescriptions", "create")).toBe(true);
    expect(can("DOCTOR", "prescriptions", "print")).toBe(true);
    expect(can("DOCTOR", "prescriptions", "delete")).toBe(false);
    expect(can("DOCTOR", "emr", "delete")).toBe(false);
  });

  it("lets reception run the front desk but not delete or see admin modules", () => {
    expect(can("RECEPTIONIST", "appointments", "create")).toBe(true);
    expect(can("RECEPTIONIST", "patients", "create")).toBe(true);
    expect(can("RECEPTIONIST", "billing", "create")).toBe(true);
    expect(can("RECEPTIONIST", "appointments", "delete")).toBe(false);
    expect(can("RECEPTIONIST", "patients", "delete")).toBe(false);
    expect(can("RECEPTIONIST", "settings", "view")).toBe(false);
  });

  it("keeps patients read/print-only on clinical data", () => {
    expect(can("PATIENT", "prescriptions", "print")).toBe(true);
    expect(can("PATIENT", "prescriptions", "edit")).toBe(false);
    expect(can("PATIENT", "billing", "create")).toBe(false);
    expect(can("PATIENT", "appointments", "create")).toBe(true);
  });

  it("gives admin full management incl. delete on operational modules", () => {
    expect(can("ADMIN", "branches", "delete")).toBe(true);
    expect(can("ADMIN", "inventory", "delete")).toBe(true);
    expect(can("ADMIN", "appointments", "delete")).toBe(false);
    expect(can("ADMIN", "prescriptions", "edit")).toBe(false);
  });

  it("derives view access from the matrix (no orphan actions without view)", () => {
    for (const role of ROLES) {
      const mods = PERMISSIONS[role];
      for (const [mod, actions] of Object.entries(mods)) {
        if (actions && actions.length > 0) {
          expect(canAccess(role, mod as keyof typeof mods)).toBe(true);
        }
      }
    }
  });
});
