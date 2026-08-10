import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { Appointment, Prescription } from "@/types/domain";

/**
 * Integration tests for the prescription write path. `next/headers` and
 * `next/cache` are mocked so the server action can run outside a request
 * scope; everything else (authorize → zod → mutate → audit) is the real code.
 */
const currentRole = { value: "DOCTOR" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { updatePrescriptionAction, createPrescriptionAction } = await import("./prescription.actions");
const { db } = await import("@/server/repositories");

beforeEach(() => {
  currentRole.value = "DOCTOR";
});

// The demo dataset ships doc_bhosikar / pat_demo / br_ravet but starts with
// no prescriptions or appointments (clean slate) — these tests insert their
// own fixtures rather than relying on stale seeded rows.
const rxFixture: Prescription = {
  id: "rx_test_001",
  patientId: "pat_demo",
  patientName: "Demo Patient",
  doctorId: "doc_bhosikar",
  doctorName: "Dr. Abhijeet Bhosikar",
  branchId: "br_ravet",
  diagnoses: ["Rheumatoid Arthritis"],
  symptoms: "Joint pain",
  medicines: [],
  investigations: [],
  advice: null,
  followUpDate: null,
  createdAt: new Date().toISOString(),
};

const apptFixture: Appointment = {
  id: "apt_test_006",
  branchId: "br_ravet",
  branchName: "Dr. Bhosikar's Rheumatology Clinic",
  patientId: "pat_demo",
  patientName: "Demo Patient",
  patientMrn: "DEMO-000001",
  doctorId: "doc_bhosikar",
  doctorName: "Dr. Abhijeet Bhosikar",
  type: "SCHEDULED",
  status: "CONFIRMED",
  scheduledStart: new Date().toISOString(),
  scheduledEnd: new Date(Date.now() + 30 * 60_000).toISOString(),
  tokenNumber: 1,
  reason: null,
  paymentStatus: "UNPAID",
};

beforeAll(async () => {
  await db.prescriptions.insert(rxFixture);
  await db.appointments.insert(apptFixture);
});

describe("updatePrescriptionAction", () => {
  it("revises an existing prescription and writes an audit row", async () => {
    const auditBefore = (await db.auditLog.list()).length;

    const res = await updatePrescriptionAction({
      prescriptionId: rxFixture.id,
      complaints: ["Recurrent joint pain"],
      notes: "Improving on current regimen",
      diagnoses: ["Rheumatoid Arthritis"],
      medicines: [
        { name: "Methotrexate 7.5mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 45, instructions: null },
      ],
      investigations: [],
      advice: ["Continue physiotherapy"],
      followUpDate: "2026-09-15",
      vitals: { weightKg: 73 },
    });

    expect(res.ok).toBe(true);
    const updated = (await db.prescriptions.get(rxFixture.id))!;
    expect(updated.medicines).toHaveLength(1);
    expect(updated.medicines[0].durationDays).toBe(45);
    expect(updated.diagnoses).toEqual(["Rheumatoid Arthritis"]);
    expect(updated.advice).toBe("Continue physiotherapy");
    expect(updated.followUpDate?.slice(0, 10)).toBe("2026-09-15");
    expect(updated.vitals?.weightKg).toBe(73);

    const auditLog = await db.auditLog.list();
    expect(auditLog.length).toBe(auditBefore + 1);
    expect(auditLog[auditLog.length - 1].entity).toBe("Prescription");
  });

  it("rejects an unknown prescription", async () => {
    const res = await updatePrescriptionAction({
      prescriptionId: "rx_missing",
      complaints: [],
      diagnoses: ["X"],
      medicines: [],
      investigations: [],
      advice: [],
      followUpDate: null,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/not found/i);
  });

  it("refuses to empty out a clinical record", async () => {
    const res = await updatePrescriptionAction({
      prescriptionId: rxFixture.id,
      complaints: [],
      diagnoses: [],
      medicines: [],
      investigations: [],
      advice: [],
      followUpDate: null,
    });
    expect(res.ok).toBe(false);
  });

  it("denies roles without prescription edit rights", async () => {
    currentRole.value = "RECEPTIONIST";
    const res = await updatePrescriptionAction({
      prescriptionId: rxFixture.id,
      complaints: [],
      diagnoses: ["Rheumatoid Arthritis"],
      medicines: [],
      investigations: [],
      advice: [],
      followUpDate: null,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/permission/i);
  });
});

describe("createPrescriptionAction", () => {
  it("saves a consultation and completes the appointment", async () => {
    const countBefore = (await db.prescriptions.list()).length;

    const res = await createPrescriptionAction({
      appointmentId: apptFixture.id,
      complaints: ["Joint swelling"],
      diagnoses: ["Rheumatoid Arthritis"],
      medicines: [
        { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "0-0-1", timing: "After dinner", durationDays: 30, instructions: null },
      ],
      investigations: [],
      advice: ["Physiotherapy"],
      followUpDate: null,
    });

    expect(res.ok).toBe(true);
    expect((await db.prescriptions.list()).length).toBe(countBefore + 1);
    expect((await db.appointments.get(apptFixture.id))!.status).toBe("COMPLETED");
    expect(res.data?.patientName).toBe(apptFixture.patientName);

    // Front desk is told a pharmacy bill is due, deep-linked to a prefilled bill.
    const note = (await db.notifications.list((n) => n.id === `ntf_rx_${res.data!.id}`))[0];
    expect(note).toBeDefined();
    expect(note.type).toBe("PHARMACY_BILL_PENDING");
    expect(note.read).toBe(false);
    expect(note.actionUrl).toBe(
      `/reception/billing?patientId=${apptFixture.patientId}&prescriptionId=${res.data!.id}`,
    );
    // Broadcast (no recipientId) so whoever is on the desk sees it.
    expect(note.recipientId).toBeUndefined();
  });

  it("does not raise a billing notification when nothing was prescribed", async () => {
    const appt = await db.appointments.insert({
      ...apptFixture,
      id: "apt_test_nomeds",
      status: "CONFIRMED",
    });
    const res = await createPrescriptionAction({
      appointmentId: appt.id,
      complaints: ["Review only"],
      diagnoses: ["Rheumatoid Arthritis"],
      medicines: [],
      investigations: [],
      advice: [],
      followUpDate: null,
    });
    expect(res.ok).toBe(true);
    const note = (await db.notifications.list((n) => n.id === `ntf_rx_${res.data!.id}`))[0];
    expect(note).toBeUndefined();
  });

  it("rejects an unknown appointment", async () => {
    const res = await createPrescriptionAction({
      appointmentId: "apt_missing",
      complaints: [],
      diagnoses: ["X"],
      medicines: [],
      investigations: [],
      advice: [],
      followUpDate: null,
    });
    expect(res.ok).toBe(false);
  });
});
