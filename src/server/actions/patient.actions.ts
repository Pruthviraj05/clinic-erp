"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { patients } from "@/server/demo/data";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import { createPatientSchema, updatePatientSchema } from "@/features/patients/schema";
import type { ActionResult } from "./appointment.actions";
import type { Patient } from "@/types/domain";

/** Revalidate every route that renders patient data (lists + profile). */
function revalidatePatients(id?: string) {
  revalidatePath("/admin/patients");
  revalidatePath("/reception/patients");
  revalidatePath("/doctor/patients");
  if (id) {
    revalidatePath(`/admin/patients/${id}`);
    revalidatePath(`/reception/patients/${id}`);
    revalidatePath(`/doctor/patients/${id}`);
  }
}

/**
 * Register a patient. Generates the next MRN.
 * DEMO MODE: appends to the in-memory list. PRISMA MODE: repository.create with
 * an MRN sequence per organization inside a transaction.
 */
export async function createPatientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Patient>> {
  const authz = await authorize("patients", "create");
  if (!authz.ok) return authz;

  const parsed = createPatientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  // Next MRN = max existing + 1 (length-based math breaks once rows are
  // removed or seeds change).
  const nextSeq = patients.reduce((max, p) => {
    const n = Number(p.mrn.replace(/\D/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 100233) + 1;
  const patient: Patient = {
    id: `pat_${Date.now()}`,
    mrn: `MRN-${nextSeq}`,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    fullName: [input.firstName, input.lastName].filter(Boolean).join(" "),
    gender: input.gender,
    dateOfBirth: input.dateOfBirth || null,
    bloodGroup: input.bloodGroup,
    phone: input.phone,
    email: input.email || null,
    city: input.city ?? null,
    allergies: input.allergies || null,
    chronicDiseases: input.chronicDiseases || null,
    createdAt: new Date().toISOString(),
    lastVisitAt: null,
    isActive: true,
  };
  patients.push(patient);

  revalidatePath("/admin/patients");
  revalidatePath("/reception/patients");
  revalidatePath("/doctor/patients");
  return { ok: true, message: `Registered ${patient.fullName} (${patient.mrn}).`, data: patient };
}

/**
 * Update a patient's demographics/medical background. MRN and createdAt are
 * immutable; fullName is recomputed from the posted names.
 */
export async function updatePatientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Patient>> {
  const authz = await authorize("patients", "edit");
  if (!authz.ok) return authz;

  const parsed = updatePatientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const existing = await db.patients.get(input.id);
  if (!existing) return { ok: false, message: "Patient not found." };

  const updated = await db.patients.update(input.id, {
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    fullName: [input.firstName, input.lastName].filter(Boolean).join(" "),
    gender: input.gender,
    dateOfBirth: input.dateOfBirth || null,
    bloodGroup: input.bloodGroup,
    phone: input.phone,
    email: input.email || null,
    city: input.city ?? null,
    allergies: input.allergies || null,
    chronicDiseases: input.chronicDiseases || null,
  });
  if (!updated) return { ok: false, message: "Patient not found." };

  logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "UPDATE",
    entity: "Patient",
    summary: `Updated patient ${updated.fullName} (${updated.mrn})`,
  });
  revalidatePatients(updated.id);
  return { ok: true, message: `Updated ${updated.fullName}.`, data: updated };
}

/** Deactivate (soft-delete) or reactivate a patient. */
export async function setPatientActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const authz = await authorize("patients", active ? "edit" : "delete");
  if (!authz.ok) return authz;

  const updated = await db.patients.update(id, { isActive: active });
  if (!updated) return { ok: false, message: "Patient not found." };

  logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "STATUS_CHANGE",
    entity: "Patient",
    summary: `${active ? "Reactivated" : "Deactivated"} patient ${updated.fullName} (${updated.mrn})`,
  });
  revalidatePatients(id);
  return { ok: true, message: `${updated.fullName} ${active ? "reactivated" : "deactivated"}.` };
}
