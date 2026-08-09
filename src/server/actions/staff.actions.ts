"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import { hashPassword } from "@/server/demo/users-store";
import { branchSchema, doctorSchema, receptionistSchema } from "@/features/staff/schema";
import type { ActionResult } from "./appointment.actions";
import type { Branch, Doctor, Receptionist } from "@/types/domain";

function randomTempPassword(): string {
  const raw = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
  return `${raw}9!`;
}

/**
 * Auto-create the login account for a newly added staff member, if their
 * email isn't already in use. Returns the temp password so the caller can
 * surface it once (the admin hands it to the new doctor/receptionist).
 */
async function createStaffAccount(
  role: "DOCTOR" | "RECEPTIONIST",
  fullName: string,
  email: string,
  linkId: string,
  branchId?: string,
): Promise<string | undefined> {
  const accounts = await db.users.list();
  if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) return undefined;
  const password = randomTempPassword();
  await db.users.insert({
    id: `usr_${Date.now().toString(36)}`,
    fullName,
    email,
    role,
    passwordHash: hashPassword(password),
    linkId,
    branchId,
    isActive: true,
    createdAt: new Date().toISOString(),
  });
  return password;
}

const BRANCH_PATHS = ["/admin/branches", "/admin/doctors", "/admin/receptionists"];
const DOCTOR_PATHS = ["/admin/doctors", "/admin/branches"];
const RECEPTIONIST_PATHS = ["/admin/receptionists", "/admin/branches"];

function revalidate(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

/* ------------------------------- Branches ------------------------------- */

export async function createBranchAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Branch>> {
  const authz = await authorize("branches", "create");
  if (!authz.ok) return authz;

  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const branch: Branch = {
    id: `br_${Date.now()}`,
    name: input.name,
    code: input.code,
    city: input.city || null,
    phone: input.phone || null,
    email: input.email || null,
    gstNumber: input.gstNumber || null,
    isActive: true,
  };
  await db.branches.insert(branch);

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "CREATE",
    entity: "Branch",
    summary: `Created branch ${branch.name} (${branch.code})`,
  });
  revalidate(BRANCH_PATHS);
  return { ok: true, message: `Branch ${branch.name} created.`, data: branch };
}

export async function updateBranchAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Branch>> {
  const authz = await authorize("branches", "edit");
  if (!authz.ok) return authz;

  const id = String(formData.get("id") ?? "");
  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const updated = await db.branches.update(id, {
    name: input.name,
    code: input.code,
    city: input.city || null,
    phone: input.phone || null,
    email: input.email || null,
    gstNumber: input.gstNumber || null,
  });
  if (!updated) return { ok: false, message: "Branch not found." };

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "UPDATE",
    entity: "Branch",
    summary: `Updated branch ${updated.name} (${updated.code})`,
  });
  revalidate(BRANCH_PATHS);
  return { ok: true, message: `Branch ${updated.name} updated.`, data: updated };
}

export async function setBranchActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const authz = await authorize("branches", active ? "edit" : "delete");
  if (!authz.ok) return authz;

  const updated = await db.branches.update(id, { isActive: active });
  if (!updated) return { ok: false, message: "Branch not found." };

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "STATUS_CHANGE",
    entity: "Branch",
    summary: `${active ? "Reactivated" : "Deactivated"} branch ${updated.name}`,
  });
  revalidate(BRANCH_PATHS);
  return { ok: true, message: `Branch ${active ? "reactivated" : "deactivated"}.` };
}

/* -------------------------------- Doctors ------------------------------- */

export async function createDoctorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Doctor>> {
  const authz = await authorize("doctors", "create");
  if (!authz.ok) return authz;

  const parsed = doctorSchema.safeParse({
    ...Object.fromEntries(formData),
    branchIds: formData.getAll("branchIds"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const id = `doc_${Date.now()}`;
  const doctor: Doctor = {
    id,
    userId: `usr_${id}`,
    fullName: input.fullName,
    email: input.email,
    specialization: input.specialization || null,
    department: input.department || null,
    registrationNo: input.registrationNo || null,
    qualifications: input.qualifications || null,
    consultationFee: Math.round(input.consultationFee * 100) / 100,
    branchIds: input.branchIds,
    isActive: true,
  };
  await db.doctors.insert(doctor);
  const tempPassword = await createStaffAccount("DOCTOR", doctor.fullName, doctor.email, doctor.id);

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "CREATE",
    entity: "Doctor",
    summary: `Added doctor ${doctor.fullName}`,
  });
  revalidate(DOCTOR_PATHS);
  return {
    ok: true,
    message: tempPassword
      ? `Doctor ${doctor.fullName} added. Login: ${doctor.email} / ${tempPassword}`
      : `Doctor ${doctor.fullName} added.`,
    data: doctor,
  };
}

export async function updateDoctorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Doctor>> {
  const authz = await authorize("doctors", "edit");
  if (!authz.ok) return authz;

  const id = String(formData.get("id") ?? "");
  const parsed = doctorSchema.safeParse({
    ...Object.fromEntries(formData),
    branchIds: formData.getAll("branchIds"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const updated = await db.doctors.update(id, {
    fullName: input.fullName,
    email: input.email,
    specialization: input.specialization || null,
    department: input.department || null,
    registrationNo: input.registrationNo || null,
    qualifications: input.qualifications || null,
    consultationFee: Math.round(input.consultationFee * 100) / 100,
    branchIds: input.branchIds,
  });
  if (!updated) return { ok: false, message: "Doctor not found." };

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "UPDATE",
    entity: "Doctor",
    summary: `Updated doctor ${updated.fullName}`,
  });
  revalidate(DOCTOR_PATHS);
  return { ok: true, message: `Doctor ${updated.fullName} updated.`, data: updated };
}

export async function setDoctorActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const authz = await authorize("doctors", active ? "edit" : "delete");
  if (!authz.ok) return authz;

  // Deactivation only flips the flag — the doctor's appointments are kept.
  const updated = await db.doctors.update(id, { isActive: active });
  if (!updated) return { ok: false, message: "Doctor not found." };

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "STATUS_CHANGE",
    entity: "Doctor",
    summary: `${active ? "Reactivated" : "Deactivated"} doctor ${updated.fullName}`,
  });
  revalidate(DOCTOR_PATHS);
  return { ok: true, message: `Doctor ${active ? "reactivated" : "deactivated"}.` };
}

/* ----------------------------- Receptionists ---------------------------- */

export async function createReceptionistAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Receptionist>> {
  const authz = await authorize("receptionists", "create");
  if (!authz.ok) return authz;

  const parsed = receptionistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const branch = await db.branches.get(input.branchId);
  if (!branch) return { ok: false, message: "Invalid branch." };

  const id = `rec_${Date.now()}`;
  const receptionist: Receptionist = {
    id,
    userId: `usr_${id}`,
    fullName: input.fullName,
    email: input.email,
    branchId: input.branchId,
    employeeCode: input.employeeCode || null,
    isActive: true,
  };
  await db.receptionists.insert(receptionist);
  const tempPassword = await createStaffAccount(
    "RECEPTIONIST",
    receptionist.fullName,
    receptionist.email,
    receptionist.id,
    receptionist.branchId,
  );

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "CREATE",
    entity: "Receptionist",
    summary: `Added receptionist ${receptionist.fullName}`,
  });
  revalidate(RECEPTIONIST_PATHS);
  return {
    ok: true,
    message: tempPassword
      ? `Receptionist ${receptionist.fullName} added. Login: ${receptionist.email} / ${tempPassword}`
      : `Receptionist ${receptionist.fullName} added.`,
    data: receptionist,
  };
}

export async function updateReceptionistAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Receptionist>> {
  const authz = await authorize("receptionists", "edit");
  if (!authz.ok) return authz;

  const id = String(formData.get("id") ?? "");
  const parsed = receptionistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const branch = await db.branches.get(input.branchId);
  if (!branch) return { ok: false, message: "Invalid branch." };

  const updated = await db.receptionists.update(id, {
    fullName: input.fullName,
    email: input.email,
    branchId: input.branchId,
    employeeCode: input.employeeCode || null,
  });
  if (!updated) return { ok: false, message: "Receptionist not found." };

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "UPDATE",
    entity: "Receptionist",
    summary: `Updated receptionist ${updated.fullName}`,
  });
  revalidate(RECEPTIONIST_PATHS);
  return { ok: true, message: `Receptionist ${updated.fullName} updated.`, data: updated };
}

export async function setReceptionistActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const authz = await authorize("receptionists", active ? "edit" : "delete");
  if (!authz.ok) return authz;

  const updated = await db.receptionists.update(id, { isActive: active });
  if (!updated) return { ok: false, message: "Receptionist not found." };

  await logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "STATUS_CHANGE",
    entity: "Receptionist",
    summary: `${active ? "Reactivated" : "Deactivated"} receptionist ${updated.fullName}`,
  });
  revalidate(RECEPTIONIST_PATHS);
  return { ok: true, message: `Receptionist ${active ? "reactivated" : "deactivated"}.` };
}
