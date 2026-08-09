"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { createGroup, groupsForDoctor } from "@/server/demo/disease-store";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";

/** The doctor record this session may manage groups for. */
function doctorIdFor(role: string, linkId: string | undefined, userId: string): string {
  return role === "DOCTOR" && linkId ? linkId : userId;
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

  const doctorId = doctorIdFor(user.role, user.linkId, user.id);
  const existingGroups = await groupsForDoctor(doctorId);
  const exists = existingGroups.find((g) => g.name.toLowerCase() === parsed.data.toLowerCase());
  if (exists) return { ok: false, message: `You already have a “${exists.name}” list.` };

  const group = await createGroup(doctorId, parsed.data);
  if (firstPatientId && (await db.patients.get(firstPatientId))) {
    await db.diseaseGroups.update(group.id, { patientIds: [firstPatientId] });
  }

  await logAudit({
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

  const doctorId = doctorIdFor(user.role, user.linkId, user.id);
  const group = await db.diseaseGroups.get(groupId);
  if (!group) return { ok: false, message: "Disease list not found." };
  if (group.doctorId !== doctorId && user.role !== "ADMIN") {
    return { ok: false, message: "You can only manage your own disease lists." };
  }
  const patient = await db.patients.get(patientId);
  if (!patient) return { ok: false, message: "Patient not found." };

  const nextIds = new Set(group.patientIds);
  if (present) nextIds.add(patientId);
  else nextIds.delete(patientId);
  await db.diseaseGroups.update(groupId, { patientIds: Array.from(nextIds) });

  await logAudit({
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
