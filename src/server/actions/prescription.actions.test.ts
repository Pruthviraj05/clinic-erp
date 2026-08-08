import { describe, it, expect, vi, beforeEach } from "vitest";

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
const { prescriptions, appointments } = await import("@/server/demo/data");
const { auditLog } = await import("@/server/demo/extra");

beforeEach(() => {
  currentRole.value = "DOCTOR";
});

describe("updatePrescriptionAction", () => {
  it("revises an existing prescription and writes an audit row", async () => {
    const rx = prescriptions.find((p) => p.id === "rx_001")!;
    const auditBefore = auditLog.length;

    const res = await updatePrescriptionAction({
      prescriptionId: "rx_001",
      complaints: ["Recurrent acne"],
      notes: "Improving on current regimen",
      diagnoses: ["Acne vulgaris (L70.0)"],
      medicines: [
        { name: "Adapalene 0.1% Gel", dosage: "Thin layer", frequency: "0-0-1", timing: "At night", durationDays: 45, instructions: null },
      ],
      investigations: [],
      advice: ["Continue sunscreen"],
      followUpDate: "2026-09-15",
      vitals: { weightKg: 73 },
    });

    expect(res.ok).toBe(true);
    expect(rx.medicines).toHaveLength(1);
    expect(rx.medicines[0].durationDays).toBe(45);
    expect(rx.diagnoses).toEqual(["Acne vulgaris (L70.0)"]);
    expect(rx.advice).toBe("Continue sunscreen");
    expect(rx.followUpDate?.slice(0, 10)).toBe("2026-09-15");
    expect(rx.vitals?.weightKg).toBe(73);
    expect(auditLog.length).toBe(auditBefore + 1);
    expect(auditLog[0].entity).toBe("Prescription");
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
      prescriptionId: "rx_001",
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
      prescriptionId: "rx_001",
      complaints: [],
      diagnoses: ["Acne vulgaris (L70.0)"],
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
    const appt = appointments.find((a) => a.id === "apt_006")!;
    const countBefore = prescriptions.length;

    const res = await createPrescriptionAction({
      appointmentId: appt.id,
      complaints: ["Pigmentation"],
      diagnoses: ["Melasma"],
      medicines: [
        { name: "Kojic acid cream", dosage: "Thin layer", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: null },
      ],
      investigations: [],
      advice: ["Daily sunscreen"],
      followUpDate: null,
    });

    expect(res.ok).toBe(true);
    expect(prescriptions.length).toBe(countBefore + 1);
    expect(appt.status).toBe("COMPLETED");
    expect(res.data?.patientName).toBe(appt.patientName);
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
