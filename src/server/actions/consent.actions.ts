"use server";

import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import { signatureDataUrlSchema } from "@/lib/upload-validation";
import { CONSENT_CATEGORIES } from "@/lib/consent-categories";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getCachedDoctor } from "@/server/cache/reference-data";
import { logAudit } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";
import type { ConsentFormItem } from "@/server/demo/extra";

function revalidateConsent(id?: string) {
  revalidatePath("/portal/consent");
  revalidatePath("/admin/consent");
  revalidatePath("/reception/consent");
  revalidatePath("/doctor/consent");
  revalidatePath("/doctor/notifications");
  revalidatePath("/doctor");
  if (id) {
    revalidatePath(`/portal/consent/${id}`);
    revalidatePath(`/admin/consent/${id}`);
    revalidatePath(`/reception/consent/${id}`);
    revalidatePath(`/doctor/consent/${id}`);
  }
}

/**
 * Form numbers come from an atomic counter, never a row count — same reasoning
 * as invoice numbers (see billing.actions.ts): counting is racy under
 * concurrent front-desk entry and shifts every time an old row is removed.
 * Offset by the 3 seeded demo forms (CF-2026-000001..3) so a fresh counter
 * never mints a number that collides with them.
 */
async function nextConsentFormNo(): Promise<string> {
  const seq = await db.counters.next("consentForm");
  return `CF-2026-${String(3 + seq).padStart(6, "0")}`;
}

// A checkbox posts "on" when checked and is simply absent from FormData when
// not — `.optional()` (not a union with z.undefined()) is what actually makes
// zod treat the missing key as valid rather than "expected nonoptional".
const boolField = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const consentFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  doctorId: z.string().min(1, "Assign a doctor"),
  category: z.enum(CONSENT_CATEGORIES as [string, ...string[]]),
  title: z.string().trim().min(4, "Give the form a title").max(120),
  body: z.string().trim().min(10, "Add the consent text").max(4000),
  details: z.string().trim().max(2000).optional(),
  risksExplained: boolField,
  alternativesDiscussed: boolField,
  questionsAnswered: boolField,
  interpreterUsed: boolField,
  witnessName: z.string().trim().max(120).optional(),
  witnessRelation: z.string().trim().max(60).optional(),
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

  const [patient, doctor] = await Promise.all([db.patients.get(input.patientId), getCachedDoctor(input.doctorId)]);
  if (!patient || !doctor) return { ok: false, message: "Invalid patient or doctor." };

  const id = newId("cf");
  const formNo = await nextConsentFormNo();
  const form: ConsentFormItem = {
    id,
    formNo,
    category: input.category as ConsentFormItem["category"],
    patientId: patient.id,
    patientName: patient.fullName,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    branchId: doctor.branchIds[0],
    title: input.title,
    body: input.body,
    details: input.details || undefined,
    risksExplained: input.risksExplained,
    alternativesDiscussed: input.alternativesDiscussed,
    questionsAnswered: input.questionsAnswered,
    interpreterUsed: input.interpreterUsed,
    witnessName: input.witnessName || undefined,
    witnessRelation: input.witnessRelation || undefined,
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
    summary: `Consent ${formNo} “${input.title}” for ${patient.fullName} → ${doctor.fullName}`,
  });
  revalidateConsent();
  return { ok: true, message: `Consent form ${formNo} created for ${patient.fullName}.`, data: { id } };
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
  const doctor = await getCachedDoctor(input.doctorId);
  if (!doctor) return { ok: false, message: "Invalid doctor." };

  // Rows created before form numbers existed have none — backfill on first edit
  // rather than leaving them permanently blank on the printed letterhead.
  const formNo = form.formNo ?? (await nextConsentFormNo());

  const updated = await db.consentForms.update(input.id, {
    formNo,
    category: input.category as ConsentFormItem["category"],
    title: input.title,
    body: input.body,
    details: input.details || undefined,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    branchId: form.branchId ?? doctor.branchIds[0],
    risksExplained: input.risksExplained,
    alternativesDiscussed: input.alternativesDiscussed,
    questionsAnswered: input.questionsAnswered,
    interpreterUsed: input.interpreterUsed,
    witnessName: input.witnessName || undefined,
    witnessRelation: input.witnessRelation || undefined,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { ok: false, message: "Consent form not found." };

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "ConsentForm",
    summary: `Edited consent ${updated.formNo} “${updated.title}” for ${updated.patientName}`,
  });
  revalidateConsent(input.id);
  return { ok: true, message: "Consent form updated." };
}

/** Record a signed consent form with the captured patient e-signature. */
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
  if (form.status !== "PENDING") {
    return { ok: false, message: `This consent form is already ${form.status.toLowerCase()}.` };
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
    summary: `Signed consent ${updated.formNo} “${updated.title}” (${updated.patientName})`,
  });
  revalidateConsent(id);
  return { ok: true, message: "Consent signed successfully." };
}

/**
 * The doctor's own signature, confirming the explanation was actually given.
 * Independent of the patient's status — a doctor can sign before or after the
 * patient does, and this alone never marks the form SIGNED.
 */
export async function doctorSignConsentAction(
  id: string,
  signatureDataUrl: string,
): Promise<ActionResult> {
  const authz = await authorize("consent", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;
  if (user.role !== "DOCTOR") {
    return { ok: false, message: "Only the assigned doctor can sign this way." };
  }

  const signatureCheck = signatureDataUrlSchema.safeParse(signatureDataUrl ?? "");
  if (!signatureCheck.success) {
    return { ok: false, message: "Please provide a valid signature before submitting." };
  }
  const form = await db.consentForms.get(id);
  if (!form) return { ok: false, message: "Consent form not found." };
  if (form.doctorId !== user.linkId) {
    return { ok: false, message: "You can only sign consent forms assigned to you." };
  }
  if (form.status === "DECLINED") {
    return { ok: false, message: "This consent was declined by the patient." };
  }
  if (form.doctorSignedAt) {
    return { ok: false, message: "You have already signed this form." };
  }

  const updated = await db.consentForms.update(id, {
    doctorSignatureDataUrl: signatureDataUrl,
    doctorSignedAt: new Date().toISOString(),
  });
  if (!updated) return { ok: false, message: "Consent form not found." };

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "SIGN",
    entity: "ConsentForm",
    summary: `Doctor countersigned consent ${updated.formNo} “${updated.title}” (${updated.patientName})`,
  });
  revalidateConsent(id);
  return { ok: true, message: "Signed. The patient can now review and sign." };
}

/** The patient (or front desk on their behalf) declines the consent, with a reason. */
export async function declineConsentAction(id: string, reason: string): Promise<ActionResult> {
  const authz = await authorize("consent", "create");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const trimmed = reason?.trim();
  if (!trimmed || trimmed.length < 4) {
    return { ok: false, message: "Give a reason for declining." };
  }

  const form = await db.consentForms.get(id);
  if (!form) return { ok: false, message: "Consent form not found." };
  if (form.status !== "PENDING") {
    return { ok: false, message: `This consent form is already ${form.status.toLowerCase()}.` };
  }
  if (user.role === "PATIENT" && form.patientId !== user.linkId) {
    return { ok: false, message: "You can only decline your own consent forms." };
  }

  const updated = await db.consentForms.update(id, {
    status: "DECLINED",
    declineReason: trimmed,
    declinedAt: new Date().toISOString(),
  });
  if (!updated) return { ok: false, message: "Consent form not found." };

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "STATUS_CHANGE",
    entity: "ConsentForm",
    summary: `Declined consent ${updated.formNo} “${updated.title}” (${updated.patientName}) — ${trimmed}`,
  });
  revalidateConsent(id);
  return { ok: true, message: "Consent declined and recorded." };
}
