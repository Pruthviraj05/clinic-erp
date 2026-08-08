"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { createGroup, diseaseGroups } from "@/server/demo/disease-store";
import { patients } from "@/server/demo/data";
import { logAudit } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";

/** Demo doctor mapping — real auth resolves the doctor from the session user. */
function doctorIdFor(role: string, userId: string): string {
  return role === "DOCTOR" ? "doc_mehta" : userId;
}

function revalidateDiseasePages() {
  revalidatePath("/doctor/diseases");
  revalidatePath("/doctor/patients");
}

const nameSchema = z.string().trim().min(2, "Name the condition").max(60);

/** Create a disease group (optionally with a first patient — consult screen flow). */
export async function createDiseaseGroupAction(
  name: string,
  firstPatientId?: string,
): Promise<ActionResult<{ id: string }>> {
  const authz = await authorize("patients", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid name." };

  const doctorId = doctorIdFor(user.role, user.id);
  const exists = diseaseGroups.find(
    (g) => g.doctorId === doctorId && g.name.toLowerCase() === parsed.data.toLowerCase(),
  );
  if (exists) return { ok: false, message: `You already have a “${exists.name}” list.` };

  const group = createGroup(doctorId, parsed.data);
  if (firstPatientId && patients.some((p) => p.id === firstPatientId)) {
    group.patientIds.push(firstPatientId);
  }

  logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "DiseaseGroup",
    summary: `Created disease list “${group.name}”`,
  });
  revalidateDiseasePages();
  return { ok: true, message: `“${group.name}” list created.`, data: { id: group.id } };
}

/** Add/remove a patient in a disease group (toggle from consult or list page). */
export async function setPatientInGroupAction(
  groupId: string,
  patientId: string,
  present: boolean,
): Promise<ActionResult> {
  const authz = await authorize("patients", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const doctorId = doctorIdFor(user.role, user.id);
  const group = diseaseGroups.find((g) => g.id === groupId);
  if (!group) return { ok: false, message: "Disease list not found." };
  if (group.doctorId !== doctorId && user.role !== "ADMIN") {
    return { ok: false, message: "You can only manage your own disease lists." };
  }
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return { ok: false, message: "Patient not found." };

  const idx = group.patientIds.indexOf(patientId);
  if (present && idx === -1) group.patientIds.push(patientId);
  if (!present && idx !== -1) group.patientIds.splice(idx, 1);

  logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "DiseaseGroup",
    summary: `${present ? "Added" : "Removed"} ${patient.fullName} ${present ? "to" : "from"} “${group.name}”`,
  });
  revalidateDiseasePages();
  return {
    ok: true,
    message: `${patient.fullName} ${present ? "added to" : "removed from"} “${group.name}”.`,
  };
}
