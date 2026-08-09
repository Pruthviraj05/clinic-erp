"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { addRxTemplate } from "@/server/demo/template-store";
import { RX_ACCENTS, type RxDesign } from "@/server/demo/rx-design-store";
import { logAudit } from "@/server/demo/extra";
import type { Prescription } from "@/types/domain";
import type { ActionResult } from "./appointment.actions";

const medicineSchema = z.object({
  name: z.string().min(1).max(120),
  dosage: z.string().max(80).nullable(),
  frequency: z.string().max(40).nullable(),
  timing: z.string().max(60).nullable(),
  durationDays: z.number().int().min(1).max(365).nullable(),
  instructions: z.string().max(200).nullable(),
});

const consultPayloadSchema = z.object({
  appointmentId: z.string().min(1),
  complaints: z.array(z.string().max(200)).max(20),
  notes: z.string().max(2000).optional(),
  diagnoses: z.array(z.string().max(200)).max(20),
  medicines: z.array(medicineSchema).max(30),
  investigations: z.array(z.string().max(200)).max(20),
  advice: z.array(z.string().max(300)).max(20),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  vitals: z
    .object({
      heightCm: z.number().positive().max(260).optional(),
      weightKg: z.number().positive().max(400).optional(),
      bp: z.string().max(12).optional(),
      pulse: z.number().positive().max(300).optional(),
      tempC: z.number().min(30).max(45).optional(),
      spo2: z.number().min(40).max(100).optional(),
    })
    .optional(),
});

export type ConsultPayload = z.infer<typeof consultPayloadSchema>;

let rxSeq = 100;

/**
 * Save a consultation: creates the Prescription, completes the appointment and
 * stamps the patient's last visit — the doctor's single "Save & Complete".
 */
export async function createPrescriptionAction(
  payload: ConsultPayload,
): Promise<ActionResult<Prescription>> {
  const authz = await authorize("prescriptions", "create");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = consultPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "The consultation could not be validated. Check the entered values." };
  }
  const input = parsed.data;

  const appt = await db.appointments.get(input.appointmentId);
  if (!appt) return { ok: false, message: "Appointment not found." };
  if (input.diagnoses.length === 0 && input.medicines.length === 0) {
    return { ok: false, message: "Add at least a diagnosis or a medicine before saving." };
  }

  const followUpIso = input.followUpDate ? new Date(`${input.followUpDate}T09:00`).toISOString() : null;
  if (input.followUpDate && Number.isNaN(new Date(`${input.followUpDate}T09:00`).getTime())) {
    return { ok: false, message: "Invalid follow-up date." };
  }

  const now = new Date().toISOString();
  const rx: Prescription = {
    id: `rx_${String(rxSeq++).padStart(3, "0")}_${Date.now().toString(36)}`,
    patientId: appt.patientId,
    patientName: appt.patientName,
    doctorId: appt.doctorId,
    doctorName: appt.doctorName,
    branchId: appt.branchId,
    diagnoses: input.diagnoses,
    symptoms: [input.complaints.join(", "), input.notes?.trim()].filter(Boolean).join(". ") || null,
    medicines: input.medicines,
    investigations: input.investigations,
    advice: input.advice.join(" ") || null,
    followUpDate: followUpIso,
    createdAt: now,
    vitals: input.vitals && Object.keys(input.vitals).length ? input.vitals : undefined,
  };
  await db.prescriptions.insert(rx);

  // Consultation done → complete the appointment + stamp the patient.
  await db.appointments.update(appt.id, { status: "COMPLETED" });
  await db.patients.update(appt.patientId, { lastVisitAt: now });

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "Prescription",
    summary: `Prescription for ${appt.patientName} (${input.medicines.length} medicine(s))`,
  });

  revalidatePath("/doctor/prescriptions");
  revalidatePath("/doctor/appointments");
  revalidatePath("/doctor/consult");
  revalidatePath("/admin/prescriptions");
  revalidatePath("/portal/prescriptions");
  return { ok: true, message: `Prescription saved for ${appt.patientName}.`, data: rx };
}

const updatePayloadSchema = consultPayloadSchema
  .omit({ appointmentId: true })
  .extend({ prescriptionId: z.string().min(1) });

export type UpdateRxPayload = z.infer<typeof updatePayloadSchema>;

/**
 * Update a previously saved prescription (doctor corrects or extends it).
 * Doctors may only edit their own prescriptions; the audit trail records the
 * revision. Clinical records are never deleted — edits are the only mutation.
 */
export async function updatePrescriptionAction(
  payload: UpdateRxPayload,
): Promise<ActionResult<Prescription>> {
  const authz = await authorize("prescriptions", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = updatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "The prescription could not be validated. Check the entered values." };
  }
  const input = parsed.data;

  const rx = await db.prescriptions.get(input.prescriptionId);
  if (!rx) return { ok: false, message: "Prescription not found." };
  // A doctor edits only their own prescriptions.
  if (user.role === "DOCTOR" && rx.doctorId !== user.linkId) {
    return { ok: false, message: "You can only edit your own prescriptions." };
  }
  if (input.diagnoses.length === 0 && input.medicines.length === 0) {
    return { ok: false, message: "Keep at least a diagnosis or a medicine." };
  }
  if (input.followUpDate && Number.isNaN(new Date(`${input.followUpDate}T09:00`).getTime())) {
    return { ok: false, message: "Invalid follow-up date." };
  }

  const updated = await db.prescriptions.update(rx.id, {
    diagnoses: input.diagnoses,
    symptoms: [input.complaints.join(", "), input.notes?.trim()].filter(Boolean).join(". ") || null,
    medicines: input.medicines,
    investigations: input.investigations,
    advice: input.advice.join(" ") || null,
    followUpDate: input.followUpDate ? new Date(`${input.followUpDate}T09:00`).toISOString() : null,
    ...(input.vitals && Object.keys(input.vitals).length ? { vitals: input.vitals } : {}),
  });
  if (!updated) return { ok: false, message: "Prescription not found." };

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "Prescription",
    summary: `Revised prescription ${rx.id.toUpperCase()} for ${rx.patientName}`,
  });

  revalidatePath("/doctor/prescriptions");
  revalidatePath(`/doctor/prescriptions/${rx.id}`);
  revalidatePath("/admin/prescriptions");
  revalidatePath("/portal/prescriptions");
  return { ok: true, message: `Prescription updated for ${updated.patientName}.`, data: updated };
}

const rxDesignSchema = z.object({
  headerNote: z.string().max(200),
  footerNote: z.string().max(500),
  accentColor: z.string().refine((c) => RX_ACCENTS.includes(c), "Pick one of the offered colours"),
  language: z.enum(["en", "mr", "both"]),
  showQr: z.boolean(),
  showVitals: z.boolean(),
});

/** Save the doctor's personal prescription design (header/footer/accent/language). */
export async function saveRxDesignAction(
  payload: z.infer<typeof rxDesignSchema>,
): Promise<ActionResult<RxDesign>> {
  const authz = await authorize("prescriptions", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
    return { ok: false, message: "Only doctors can design their prescriptions." };
  }

  const parsed = rxDesignSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Design could not be validated." };

  const doctorId = user.role === "DOCTOR" ? user.linkId! : user.id;
  const existing = await db.rxDesigns.get(doctorId);
  const design = { id: doctorId, doctorId, ...parsed.data };
  if (existing) await db.rxDesigns.update(doctorId, design);
  else await db.rxDesigns.insert(design);

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "RxDesign",
    summary: "Updated personal prescription design",
  });
  revalidatePath("/doctor/rx-design");
  revalidatePath("/doctor/prescriptions");
  return { ok: true, message: "Prescription design saved.", data: design };
}

const templatePayloadSchema = z.object({
  name: z.string().min(2).max(80),
  diagnoses: z.array(z.string().max(200)).max(20),
  medicines: z.array(medicineSchema).max(30),
  advice: z.array(z.string().max(300)).max(20),
  investigations: z.array(z.string().max(200)).max(20),
  followUpDays: z.number().int().min(1).max(365).nullable(),
});

/** Save the current consultation as a reusable quick-start template. */
export async function saveRxTemplateAction(
  payload: z.infer<typeof templatePayloadSchema>,
): Promise<ActionResult<{ id: string }>> {
  const authz = await authorize("prescriptions", "create");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = templatePayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Template could not be validated." };
  if (parsed.data.medicines.length === 0 && parsed.data.diagnoses.length === 0) {
    return { ok: false, message: "Add a diagnosis or medicines before saving a template." };
  }

  const tpl = await addRxTemplate({ ...parsed.data, doctorId: user.linkId ?? user.id });
  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "RxTemplate",
    summary: `Saved prescription template “${tpl.name}”`,
  });
  revalidatePath("/doctor/consult");
  return { ok: true, message: `Template “${tpl.name}” saved.`, data: { id: tpl.id } };
}
