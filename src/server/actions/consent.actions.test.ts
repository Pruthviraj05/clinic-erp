import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { Doctor, Patient } from "@/types/domain";

const currentRole = { value: "RECEPTIONIST" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { createConsentAction, updateConsentAction, signConsentAction, doctorSignConsentAction, declineConsentAction } =
  await import("./consent.actions");
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
        category: "INVESTIGATION",
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
        category: "PROCEDURE",
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
      formNo: "CF-2026-900001",
      category: "PROCEDURE",
      patientId: "pat_demo",
      patientName: "Demo Patient",
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Consent for chemical peel",
      body: "I consent to the chemical peel procedure as advised by my physician.",
      risksExplained: false,
      alternativesDiscussed: false,
      questionsAnswered: false,
      interpreterUsed: false,
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
        category: "PROCEDURE",
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
      formNo: "CF-2026-900002",
      category: "OTHER",
      patientId: otherPatient.id,
      patientName: otherPatient.fullName,
      doctorId: otherDoctor.id,
      doctorName: otherDoctor.fullName,
      title: "Consent for something else",
      body: "I consent to the procedure advised by my physician.",
      risksExplained: false,
      alternativesDiscussed: false,
      questionsAnswered: false,
      interpreterUsed: false,
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "DOCTOR"; // resolves to doc_bhosikar, not otherDoctor
    const res = await updateConsentAction(
      null,
      fd({ id: form.id, doctorId: otherDoctor.id, category: "OTHER", title: form.title, body: form.body }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/assigned to you/i);
  });

  it("locks editing once the patient has signed", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_signed",
      formNo: "CF-2026-900003",
      category: "PROCEDURE",
      patientId: "pat_demo",
      patientName: "Demo Patient",
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Signed consent",
      body: "I consent to the procedure advised by my physician.",
      risksExplained: true,
      alternativesDiscussed: true,
      questionsAnswered: true,
      interpreterUsed: false,
      status: "SIGNED",
      signatureDataUrl: "data:image/png;base64,AAA",
      signedAt: new Date().toISOString(),
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "DOCTOR";
    const res = await updateConsentAction(
      null,
      fd({ id: form.id, doctorId: "doc_bhosikar", category: "PROCEDURE", title: form.title, body: form.body }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/no longer be edited/i);
  });

  it("only lets a patient sign their own form", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_not_mine",
      formNo: "CF-2026-900004",
      category: "PROCEDURE",
      patientId: otherPatient.id, // not pat_demo (the PATIENT session's linkId)
      patientName: otherPatient.fullName,
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Not mine",
      body: "I consent to the procedure advised by my physician.",
      risksExplained: false,
      alternativesDiscussed: false,
      questionsAnswered: false,
      interpreterUsed: false,
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "PATIENT"; // resolves to pat_demo
    const res = await signConsentAction(form.id, "data:image/png;base64,AAA");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/your own/i);
  });

  it("assigns sequential form numbers, offset past the seeded demo forms", async () => {
    currentRole.value = "RECEPTIONIST";
    const res1 = await createConsentAction(
      null,
      fd({
        patientId: otherPatient.id,
        doctorId: otherDoctor.id,
        category: "PROCEDURE",
        title: "Consent for Form Number Test A",
        body: "Body text long enough to pass validation.",
      }),
    );
    const res2 = await createConsentAction(
      null,
      fd({
        patientId: otherPatient.id,
        doctorId: otherDoctor.id,
        category: "PROCEDURE",
        title: "Consent for Form Number Test B",
        body: "Body text long enough to pass validation.",
      }),
    );
    expect(res1.ok && res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;
    const form1 = (await db.consentForms.get(res1.data!.id))!;
    const form2 = (await db.consentForms.get(res2.data!.id))!;
    expect(form1.formNo).toMatch(/^CF-2026-\d{6}$/);
    expect(Number(form2.formNo.split("-")[2])).toBe(Number(form1.formNo.split("-")[2]) + 1);
    // Past the 3 seeded rows (CF-2026-000001..3), never reusing one of their numbers.
    expect(Number(form1.formNo.split("-")[2])).toBeGreaterThan(3);
  });

  it("records the declaration checklist and resolves the branch from the doctor", async () => {
    currentRole.value = "RECEPTIONIST";
    const res = await createConsentAction(
      null,
      fd({
        patientId: otherPatient.id,
        doctorId: "doc_bhosikar",
        category: "TREATMENT",
        title: "Consent for Checklist Test",
        body: "Body text long enough to pass validation.",
        risksExplained: "on",
        alternativesDiscussed: "on",
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const form = (await db.consentForms.get(res.data!.id))!;
    expect(form.risksExplained).toBe(true);
    expect(form.alternativesDiscussed).toBe(true);
    expect(form.questionsAnswered).toBe(false);
    expect(form.branchId).toBe("br_ravet");
  });
});

describe("doctorSignConsentAction", () => {
  it("lets the assigned doctor countersign, and blocks signing twice", async () => {
    currentRole.value = "DOCTOR"; // resolves to doc_bhosikar
    const first = await doctorSignConsentAction("cf_seed_1", "data:image/png;base64,AAAA");
    expect(first.ok).toBe(true);
    const form = (await db.consentForms.get("cf_seed_1"))!;
    expect(form.doctorSignatureDataUrl).toBe("data:image/png;base64,AAAA");
    expect(form.doctorSignedAt).toBeTruthy();

    const second = await doctorSignConsentAction("cf_seed_1", "data:image/png;base64,AAAA");
    expect(second.ok).toBe(false);
  });

  it("blocks countersigning a form assigned to a different doctor", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_doctor_sign_other",
      formNo: "CF-2026-900005",
      category: "PROCEDURE",
      patientId: otherPatient.id,
      patientName: otherPatient.fullName,
      doctorId: otherDoctor.id,
      doctorName: otherDoctor.fullName,
      title: "Consent assigned to the other doctor",
      body: "I consent to the procedure advised by my physician.",
      risksExplained: false,
      alternativesDiscussed: false,
      questionsAnswered: false,
      interpreterUsed: false,
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "DOCTOR"; // resolves to doc_bhosikar, not otherDoctor
    const res = await doctorSignConsentAction(form.id, "data:image/png;base64,AAAA");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/assigned to you/i);
  });

  it("refuses when the caller isn't a doctor", async () => {
    currentRole.value = "RECEPTIONIST";
    const res = await doctorSignConsentAction("cf_seed_3", "data:image/png;base64,AAAA");
    expect(res.ok).toBe(false);
  });
});

describe("declineConsentAction", () => {
  it("lets a patient decline their own pending form, and blocks signing after", async () => {
    currentRole.value = "RECEPTIONIST";
    const created = await createConsentAction(
      null,
      fd({
        patientId: "pat_demo",
        doctorId: "doc_bhosikar",
        category: "OTHER",
        title: "Consent for Decline Test",
        body: "Body text long enough to pass validation.",
      }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    currentRole.value = "PATIENT"; // resolves to pat_demo
    const declined = await declineConsentAction(created.data!.id, "Patient changed their mind.");
    expect(declined.ok).toBe(true);
    const form = (await db.consentForms.get(created.data!.id))!;
    expect(form.status).toBe("DECLINED");
    expect(form.declineReason).toBe("Patient changed their mind.");

    const signAfterDecline = await signConsentAction(created.data!.id, "data:image/png;base64,AAAA");
    expect(signAfterDecline.ok).toBe(false);
  });

  it("rejects a decline with no reason", async () => {
    currentRole.value = "RECEPTIONIST";
    const created = await createConsentAction(
      null,
      fd({
        patientId: "pat_demo",
        doctorId: "doc_bhosikar",
        category: "OTHER",
        title: "Consent for Empty Reason Test",
        body: "Body text long enough to pass validation.",
      }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    currentRole.value = "PATIENT";
    const res = await declineConsentAction(created.data!.id, "  ");
    expect(res.ok).toBe(false);
    const form = (await db.consentForms.get(created.data!.id))!;
    expect(form.status).toBe("PENDING");
  });

  it("only lets a patient decline their own form", async () => {
    const form = await db.consentForms.insert({
      id: "cf_test_decline_not_mine",
      formNo: "CF-2026-900006",
      category: "PROCEDURE",
      patientId: otherPatient.id, // not pat_demo
      patientName: otherPatient.fullName,
      doctorId: "doc_bhosikar",
      doctorName: "Dr. Abhijeet Bhosikar",
      title: "Not mine either",
      body: "I consent to the procedure advised by my physician.",
      risksExplained: false,
      alternativesDiscussed: false,
      questionsAnswered: false,
      interpreterUsed: false,
      status: "PENDING",
      createdBy: "Reception (demo)",
      updatedAt: new Date().toISOString(),
    });

    currentRole.value = "PATIENT"; // resolves to pat_demo
    const res = await declineConsentAction(form.id, "Not my call to make.");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/your own/i);
  });
});
