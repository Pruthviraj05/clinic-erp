"use server";

import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import { signatureDataUrlSchema } from "@/lib/upload-validation";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";
import type { ConsentFormItem } from "@/server/demo/extra";

function revalidateConsent() {
  revalidatePath("/portal/consent");
  revalidatePath("/admin/consent");
  revalidatePath("/reception/consent");
  revalidatePath("/doctor/consent");
  revalidatePath("/doctor/notifications");
  revalidatePath("/doctor");
}

const consentFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  doctorId: z.string().min(1, "Assign a doctor"),
  title: z.string().trim().min(4, "Give the form a title").max(120),
  body: z.string().trim().min(10, "Add the consent text").max(4000),
  details: z.string().trim().max(2000).optional(),
});

/**
 * Reception fills a consent form and assigns the doctor it concerns.
 * The assigned doctor sees it under /doctor/consent and can edit it until
 * the patient signs.
 */
export async function createConsentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const authz = await authorize("consent", "create");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = consentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  // A patient may only create a form naming themselves — otherwise they can
  // inject forms for other patients into a doctor's queue.
  if (user.role === "PATIENT" && input.patientId !== user.linkId) {
    return { ok: false, message: "You can only create consent forms for yourself." };
  }

  const [patient, doctor] = await Promise.all([db.patients.get(input.patientId), db.doctors.get(input.doctorId)]);
  if (!patient || !doctor) return { ok: false, message: "Invalid patient or doctor." };

  const id = newId("cf");
  const form: ConsentFormItem = {
    id,
    patientId: patient.id,
    patientName: patient.fullName,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    title: input.title,
    body: input.body,
    details: input.details || undefined,
    status: "PENDING",
    createdBy: user.fullName,
    updatedAt: new Date().toISOString(),
  };
  await db.consentForms.insert(form);

  await db.notifications.insert({
    id: `ntf_consent_${id}`,
    type: "CONSENT_ASSIGNED",
    channel: "IN_APP",
    title: "New consent form assigned",
    body: `${user.fullName} assigned you a consent form for ${patient.fullName}: “${input.title}”.`,
    status: "SENT",
    createdAt: new Date().toISOString(),
    read: false,
    recipientId: doctor.id,
    actionUrl: "/doctor/consent",
  });

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "ConsentForm",
    summary: `Consent “${input.title}” for ${patient.fullName} → ${doctor.fullName}`,
  });
  revalidateConsent();
  return { ok: true, message: `Consent form created for ${patient.fullName}.`, data: { id } };
}

const consentUpdateSchema = consentFormSchema
  .omit({ patientId: true })
  .extend({ id: z.string().min(1) });

/** Edit a consent form (reception or the assigned doctor) while it is unsigned. */
export async function updateConsentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const authz = await authorize("consent", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = consentUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const form = await db.consentForms.get(input.id);
  if (!form) return { ok: false, message: "Consent form not found." };
  if (form.status === "SIGNED") {
    return { ok: false, message: "A signed consent form can no longer be edited." };
  }
  // Doctors edit only forms assigned to them.
  if (user.role === "DOCTOR" && form.doctorId !== user.linkId) {
    return { ok: false, message: "You can only edit consent forms assigned to you." };
  }
  const doctor = await db.doctors.get(input.doctorId);
  if (!doctor) return { ok: false, message: "Invalid doctor." };

  const updated = await db.consentForms.update(input.id, {
    title: input.title,
    body: input.body,
    details: input.details || undefined,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { ok: false, message: "Consent form not found." };

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "ConsentForm",
    summary: `Edited consent “${updated.title}” for ${updated.patientName}`,
  });
  revalidateConsent();
  return { ok: true, message: "Consent form updated." };
}

/**
 * Record a signed consent form with the captured e-signature.
 */
export async function signConsentAction(
  id: string,
  signatureDataUrl: string,
): Promise<ActionResult> {
  const authz = await authorize("consent", "create");
  if (!authz.ok) return authz;
  // `startsWith("data:image")` accepted an unbounded string of any image-ish
  // type; this checks the encoding, the MIME type and the size.
  const signatureCheck = signatureDataUrlSchema.safeParse(signatureDataUrl ?? "");
  if (!signatureCheck.success) {
    return { ok: false, message: "Please provide a valid signature before submitting." };
  }
  const form = await db.consentForms.get(id);
  if (!form) return { ok: false, message: "Consent form not found." };
  if (form.status === "SIGNED") {
    return { ok: false, message: "This consent form is already signed." };
  }
  // Ownership: a patient may only sign their own forms.
  const { user } = authz.session;
  if (user.role === "PATIENT" && form.patientId !== user.linkId) {
    return { ok: false, message: "You can only sign your own consent forms." };
  }

  const updated = await db.consentForms.update(id, {
    status: "SIGNED",
    signatureDataUrl,
    signedAt: new Date().toISOString(),
  });
  if (!updated) return { ok: false, message: "Consent form not found." };

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "SIGN",
    entity: "ConsentForm",
    summary: `Signed consent “${updated.title}” (${updated.patientName})`,
  });
  revalidateConsent();
  return { ok: true, message: "Consent signed successfully." };
}
