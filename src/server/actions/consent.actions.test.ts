import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { Doctor, Patient } from "@/types/domain";

const currentRole = { value: "RECEPTIONIST" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { createConsentAction, updateConsentAction, signConsentAction } = await import("./consent.actions");
const { db } = await import("@/server/repositories");
const { isVisibleTo } = await import("@/lib/notifications");

function fd(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.append(k, v);
  return form;
}

// The demo dataset ships one real doctor (doc_bhosikar) and one demo patient
// (pat_demo — the PATIENT session's linkId). Cross-doctor / cross-patient
// scoping tests below need a second doctor and patient, inserted once here.
const otherDoctor: Doctor = {
  id: "doc_consent_test_2",
  userId: "usr_doc_consent_test_2",
  fullName: "Dr. Consent Two",
  email: "doc.consent2@example.com",
  specialization: "General Medicine",
  department: "General",
  registrationNo: null,
  qualifications: null,
  consultationFee: 0,
  branchIds: ["br_ravet"],
  isActive: true,
};
const otherPatient: Patient = {
  id: "pat_consent_test_2",
  mrn: "TST-C002",
  firstName: "Consent",
  lastName: "Two",
  fullName: "Consent Two",
  gender: "UNDISCLOSED",
  dateOfBirth: null,
  bloodGroup: "UNKNOWN",
  phone: "+91 00000 20002",
  email: null,
  city: null,
  allergies: null,
  chronicDiseases: null,
  createdAt: new Date().toISOString(),
  lastVisitAt: null,
  isActive: true,
};

beforeAll(async () => {
  await db.doctors.insert(otherDoctor);
  await db.patients.insert(otherPatient);
});

beforeEach(() => {
  currentRole.value = "RECEPTIONIST";
});

describe("reception consent workflow", () => {
  it("creates a form with the assigned doctor and basic info", async () => {
    const res = await createConsentAction(
      null,
      fd({
        patientId: otherPatient.id,
        doctorId: otherDoctor.id,
        title: "Consent for Thyroid Investigation",
        body: "I consent to the blood investigations advised by my physician for thyroid evaluation.",
        details: "Fasting sample. No known allergies.",
      }),
    );

    expect(res.ok).toBe(true);
    const created = (await db.consentForms.get(res.data!.id))!;
    expect(created.patientName).toBe(otherPatient.fullName);
    expect(created.doctorId).toBe(otherDoctor.id);
    expect(created.doctorName).toBe(otherDoctor.fullName);
    expect(created.details).toContain("Fasting sample");
    expect(created.status).toBe("PENDING");
    expect(created.createdBy).toBeTruthy();
  });

  it("rejects incomplete forms with field errors", async () => {
    const res = await createConsentAction(null, fd({ patientId: "", doctorId: "", title: "x", body: "short" }));
    expect(res.ok).toBe(false);
    expect(res.fieldErrors).toBeDefined();
  });

  it("notifies only the assigned doctor when reception creates a form", async () => {
    const res = await createConsentAction(
      null,
      fd({
        patientId: otherPatient.id,
        doctorId: otherDoctor.id,
        title: "Consent for Joint Aspiration",
        body: "I consent to the joint aspiration procedure advised by my physician.",
      }),
    );
    expect(res.ok).toBe(true);

    const notes = await db.notifications.list((n) => n.type === "CONSENT_ASSIGNED");
    const mine = notes.find((n) => n.id === `ntf_consent_${res.data!.id}`)!;
    expect(mine).toBeDefined();
    expect(mine.recipientId).toBe(otherDoctor.id);
    expect(mine.read).toBe(false);
    expect(mine.actionUrl).toBe("/doctor/consent");
    expect(mine.body).toContain(otherPatient.fullName);

    // Targeted: visible to the assigned doctor, hidden from everyone else.
    expect(isVisibleTo(mine, otherDoctor.id)).toBe(true);
    expect(isVisibleTo(mine, "doc_bhosikar")).toBe(false);
    expect(isVisibleTo(mine, "pat_demo")).toBe(false);
  });

  it("lets the assigned doctor edit an unsigned form", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_own",
      patientId: "pat_demo",
      patientName: "Demo Patient",
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Consent for chemical peel",
      body: "I consent to the chemical peel procedure as advised by my physician.",
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "DOCTOR"; // resolves to doc_bhosikar
    const res = await updateConsentAction(
      null,
      fd({
        id: form.id,
        doctorId: "doc_bhosikar",
        title: form.title,
        body: form.body,
        details: "Peel strength reduced to 20% after review.",
      }),
    );
    expect(res.ok).toBe(true);
    const updated = (await db.consentForms.get(form.id))!;
    expect(updated.details).toContain("20%");
    expect(updated.updatedAt).toBeTruthy();
  });

  it("blocks a doctor from editing another doctor's form", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_other",
      patientId: otherPatient.id,
      patientName: otherPatient.fullName,
      doctorId: otherDoctor.id,
      doctorName: otherDoctor.fullName,
      title: "Consent for something else",
      body: "I consent to the procedure advised by my physician.",
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "DOCTOR"; // resolves to doc_bhosikar, not otherDoctor
    const res = await updateConsentAction(
      null,
      fd({ id: form.id, doctorId: otherDoctor.id, title: form.title, body: form.body }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/assigned to you/i);
  });

  it("locks editing once the patient has signed", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_signed",
      patientId: "pat_demo",
      patientName: "Demo Patient",
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Signed consent",
      body: "I consent to the procedure advised by my physician.",
      status: "SIGNED",
      signatureDataUrl: "data:image/png;base64,AAA",
      signedAt: new Date().toISOString(),
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "DOCTOR";
    const res = await updateConsentAction(
      null,
      fd({ id: form.id, doctorId: "doc_bhosikar", title: form.title, body: form.body }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/no longer be edited/i);
  });

  it("only lets a patient sign their own form", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_not_mine",
      patientId: otherPatient.id, // not pat_demo (the PATIENT session's linkId)
      patientName: otherPatient.fullName,
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Not mine",
      body: "I consent to the procedure advised by my physician.",
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "PATIENT"; // resolves to pat_demo
    const res = await signConsentAction(form.id, "data:image/png;base64,AAA");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/your own/i);
  });
});
