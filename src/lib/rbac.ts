/**
 * Role-Based Access Control.
 *
 * Granular matrix: every module exposes the six standard actions
 * (view/create/edit/delete/export/print) and each role holds an explicit
 * allowlist per module. `can()` is the single check surface used by route
 * guards, server actions and UI affordances, so swapping this constant for
 * DB-backed Role/Permission rows (already modelled in the Prisma schema)
 * changes nothing downstream.
 */

export type Role = "ADMIN" | "DOCTOR" | "RECEPTIONIST" | "PATIENT";

export const ROLES: Role[] = ["ADMIN", "DOCTOR", "RECEPTIONIST", "PATIENT"];

/** Every module/feature the app exposes. Used as permission subjects. */
export type Module =
  | "dashboard"
  | "branches"
  | "doctors"
  | "receptionists"
  | "patients"
  | "appointments"
  | "prescriptions"
  | "emr"
  | "billing"
  | "inventory"
  | "masters"
  | "reports"
  | "analytics"
  | "calendar"
  | "notifications"
  | "consent"
  | "insurance"
  | "roster"
  | "settings"
  | "roles"
  | "audit";

export const MODULES: Module[] = [
  "dashboard",
  "branches",
  "doctors",
  "receptionists",
  "patients",
  "appointments",
  "prescriptions",
  "emr",
  "billing",
  "inventory",
  "masters",
  "reports",
  "analytics",
  "calendar",
  "notifications",
  "consent",
  "insurance",
  "roster",
  "settings",
  "roles",
  "audit",
];

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "print";

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "print",
];

/** Shorthand bundles so the matrix below stays readable. */
const ALL: PermissionAction[] = ["view", "create", "edit", "delete", "export", "print"];
const MANAGE: PermissionAction[] = ["view", "create", "edit", "export", "print"]; // no delete
const READ_EXPORT: PermissionAction[] = ["view", "export"];
const READ_PRINT: PermissionAction[] = ["view", "print"];
const READ: PermissionAction[] = ["view"];

/**
 * The permission matrix: role → module → allowed actions.
 * Absent module = no access at all (not even view).
 *
 * Deliberate choices:
 * - Nobody deletes clinical records (prescriptions/EMR) — medico-legal trail;
 *   appointments are cancelled via status, not deleted.
 * - Receptionists run the front desk (patients/appointments/billing) but never
 *   see clinical analytics, inventory costs or administration.
 * - Doctors own the clinical modules for their patients; billing is read-only
 *   context, administration is closed.
 * - Patients see and print their own records; they never mutate clinical data.
 */
export const PERMISSIONS: Record<Role, Partial<Record<Module, PermissionAction[]>>> = {
  ADMIN: {
    dashboard: READ_EXPORT,
    branches: ALL,
    doctors: ALL,
    receptionists: ALL,
    patients: ALL,
    appointments: MANAGE,
    prescriptions: ["view", "export", "print"],
    emr: ["view", "export", "print"],
    billing: ALL,
    inventory: ALL,
    masters: ALL,
    reports: READ_EXPORT,
    analytics: READ_EXPORT,
    calendar: READ,
    notifications: ["view", "create"],
    consent: ["view", "create", "export", "print"],
    insurance: ALL,
    roster: ["view", "create", "edit", "delete"],
    settings: ["view", "edit"],
    roles: ["view", "edit"],
    audit: READ_EXPORT,
  },
  DOCTOR: {
    dashboard: READ,
    appointments: ["view", "edit", "export"],
    patients: ["view", "edit"],
    prescriptions: ["view", "create", "edit", "export", "print"],
    emr: ["view", "create", "edit", "print"],
    calendar: READ,
    consent: ["view", "edit", "print"],
    roster: ["view", "create", "edit"],
    notifications: READ,
  },
  RECEPTIONIST: {
    dashboard: READ,
    appointments: MANAGE,
    patients: ["view", "create", "edit", "export", "print"],
    billing: MANAGE,
    calendar: READ,
    consent: ["view", "create", "edit", "print"],
    notifications: READ,
  },
  PATIENT: {
    dashboard: READ,
    appointments: ["view", "create"],
    prescriptions: READ_PRINT,
    emr: READ_PRINT,
    billing: READ_PRINT,
    consent: ["view", "create", "print"],
    notifications: READ,
  },
};

/** The single permission check. `can(role, "billing", "delete")` etc. */
export function can(role: Role, module: Module, action: PermissionAction = "view"): boolean {
  return PERMISSIONS[role]?.[module]?.includes(action) ?? false;
}

/**
 * Which modules each role may access (view). Derived from the matrix so the
 * navigation and route guards share one source of truth.
 */
export const ROLE_MODULES: Record<Role, Module[]> = {
  ADMIN: MODULES.filter((m) => can("ADMIN", m)),
  DOCTOR: MODULES.filter((m) => can("DOCTOR", m)),
  RECEPTIONIST: MODULES.filter((m) => can("RECEPTIONIST", m)),
  PATIENT: MODULES.filter((m) => can("PATIENT", m)),
};

export function canAccess(role: Role, module: Module): boolean {
  return can(role, module, "view");
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  PATIENT: "Patient",
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/reception",
  PATIENT: "/portal",
};
