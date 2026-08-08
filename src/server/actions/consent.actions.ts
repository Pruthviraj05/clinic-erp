"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { consentForms, logAudit } from "@/server/demo/extra";
import { doctors, patients, PORTAL_PATIENT_ID } from "@/server/demo/data";
import type { ActionResult } from "./appointment.actions";

let consentSeq = 100;

function revalidateConsent() {
  revalidatePath("/portal/consent");
  revalidatePath("/admin/consent");
  revalidatePath("/reception/consent");
  revalidatePath("/doctor/consent");
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

  const patient = patients.find((p) => p.id === input.patientId);
  const doctor = doctors.find((d) => d.id === input.doctorId);
  if (!patient || !doctor) return { ok: false, message: "Invalid patient or doctor." };

  const id = `cf_${consentSeq++}`;
  consentForms.unshift({
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
  });

  logAudit({
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

  const form = consentForms.find((c) => c.id === input.id);
  if (!form) return { ok: false, message: "Consent form not found." };
  if (form.status === "SIGNED") {
    return { ok: false, message: "A signed consent form can no longer be edited." };
  }
  // Doctors edit only forms assigned to them (demo doctor mapping).
  if (user.role === "DOCTOR" && form.doctorId !== "doc_mehta") {
    return { ok: false, message: "You can only edit consent forms assigned to you." };
  }
  const doctor = doctors.find((d) => d.id === input.doctorId);
  if (!doctor) return { ok: false, message: "Invalid doctor." };

  form.title = input.title;
  form.body = input.body;
  form.details = input.details || undefined;
  form.doctorId = doctor.id;
  form.doctorName = doctor.fullName;
  form.updatedAt = new Date().toISOString();

  logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "ConsentForm",
    summary: `Edited consent “${form.title}” for ${form.patientName}`,
  });
  revalidateConsent();
  return { ok: true, message: "Consent form updated." };
}

/**
 * Record a signed consent form with the captured e-signature.
 * DEMO MODE: mutates the in-memory list. PRISMA MODE: updates ConsentForm with
 * status SIGNED, the signature asset URL and a signedAt timestamp.
 */
export async function signConsentAction(
  id: string,
  signatureDataUrl: string,
): Promise<ActionResult> {
  const authz = await authorize("consent", "create");
  if (!authz.ok) return authz;
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image")) {
    return { ok: false, message: "Please provide a signature before submitting." };
  }
  const form = consentForms.find((c) => c.id === id);
  if (!form) return { ok: false, message: "Consent form not found." };
  if (form.status === "SIGNED") {
    return { ok: false, message: "This consent form is already signed." };
  }
  // Ownership: a patient may only sign their OWN forms. (Demo portal maps to
  // one patient; with real auth this becomes the session user's patientId.)
  const { user } = authz.session;
  if (user.role === "PATIENT" && form.patientId !== PORTAL_PATIENT_ID) {
    return { ok: false, message: "You can only sign your own consent forms." };
  }

  form.status = "SIGNED";
  form.signatureDataUrl = signatureDataUrl;
  form.signedAt = new Date().toISOString();

  logAudit({
    actor: user.fullName,
    role: user.role,
    action: "SIGN",
    entity: "ConsentForm",
    summary: `Signed consent “${form.title}” (${form.patientName})`,
  });
  revalidateConsent();
  return { ok: true, message: "Consent signed successfully." };
}
