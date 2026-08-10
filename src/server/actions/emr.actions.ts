"use server";

import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import { uploadDataUrlSchema } from "@/lib/upload-validation";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";
import type { MedicalRecordItem } from "@/server/demo/extra";

const medicalRecordSchema = z.object({
  patientId: z.string().min(1, "Missing patient."),
  title: z.string().trim().min(2, "Give the record a title").max(120),
  category: z.string().trim().min(1, "Pick or type a category").max(60),
  notes: z.string().trim().max(1000).optional(),
  fileDataUrl: uploadDataUrlSchema,
  fileType: z.string().max(20).optional(),
  fileSize: z.string().max(20).optional(),
});

/**
 * Add a medical record for a patient. Patients may only add their own
 * (self-uploaded lab reports/documents); doctors may add one for any patient
 * they're viewing (e.g. while reviewing a consent form or a patient's file).
 * Either way it immediately shows up in the patient's own portal.
 */
export async function createMedicalRecordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const authz = await authorize("emr", "create");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = medicalRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  if (user.role === "PATIENT" && input.patientId !== user.linkId) {
    return { ok: false, message: "You can only add records to your own file." };
  }

  const patient = await db.patients.get(input.patientId);
  if (!patient) return { ok: false, message: "Patient not found." };

  const id = newId("rec");
  const record: MedicalRecordItem = {
    id,
    patientId: patient.id,
    title: input.title,
    category: input.category,
    fileType: input.fileType || "Note",
    fileSize: input.fileSize || "—",
    recordedAt: new Date().toISOString(),
    notes: input.notes || undefined,
    fileDataUrl: input.fileDataUrl || undefined,
    addedBy: `${user.fullName} (${user.role === "PATIENT" ? "Patient" : user.role.charAt(0) + user.role.slice(1).toLowerCase()})`,
  };
  await db.medicalRecords.insert(record);

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "MedicalRecord",
    summary: `Added record "${input.title}" for ${patient.fullName}`,
  });

  revalidatePath("/portal/records");
  revalidatePath("/portal");
  revalidatePath(`/doctor/patients/${patient.id}`);
  revalidatePath(`/admin/patients/${patient.id}`);
  revalidatePath(`/reception/patients/${patient.id}`);
  revalidatePath("/doctor/consent");
  revalidatePath("/admin/consent");
  revalidatePath("/reception/consent");

  return { ok: true, message: "Medical record added.", data: { id } };
}
