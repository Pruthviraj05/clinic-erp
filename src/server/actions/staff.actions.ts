"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import { branchSchema, doctorSchema, receptionistSchema } from "@/features/staff/schema";
import type { ActionResult } from "./appointment.actions";
import type { Branch, Doctor, Receptionist } from "@/types/domain";

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

  logAudit({
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

  logAudit({
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

  logAudit({
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

  logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "CREATE",
    entity: "Doctor",
    summary: `Added doctor ${doctor.fullName}`,
  });
  revalidate(DOCTOR_PATHS);
  return { ok: true, message: `Doctor ${doctor.fullName} added.`, data: doctor };
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

  logAudit({
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

  logAudit({
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

  logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "CREATE",
    entity: "Receptionist",
    summary: `Added receptionist ${receptionist.fullName}`,
  });
  revalidate(RECEPTIONIST_PATHS);
  return { ok: true, message: `Receptionist ${receptionist.fullName} added.`, data: receptionist };
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

  logAudit({
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

  logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "STATUS_CHANGE",
    entity: "Receptionist",
    summary: `${active ? "Reactivated" : "Deactivated"} receptionist ${updated.fullName}`,
  });
  revalidate(RECEPTIONIST_PATHS);
  return { ok: true, message: `Receptionist ${active ? "reactivated" : "deactivated"}.` };
}
