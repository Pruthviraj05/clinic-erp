import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Patient } from "@/types/domain";

const currentRole = { value: "DOCTOR" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { createDiseaseGroupAction, setPatientInGroupAction } = await import("./disease.actions");
const { db } = await import("@/server/repositories");

// The demo dataset's "DOCTOR" session resolves to doc_bhosikar (see
// src/server/demo/data.ts DEMO_USERS.DOCTOR.linkId). Patients start as a
// clean slate, so these tests insert their own fixtures.
function fixturePatient(id: string, fullName: string): Patient {
  return {
    id,
    mrn: `TST-${id.toUpperCase()}`,
    firstName: fullName,
    lastName: null,
    fullName,
    gender: "UNDISCLOSED",
    dateOfBirth: null,
    bloodGroup: "UNKNOWN",
    phone: "+91 00000 00000",
    email: null,
    city: null,
    allergies: null,
    chronicDiseases: null,
    createdAt: new Date().toISOString(),
    lastVisitAt: null,
    isActive: true,
  };
}

const patientA = fixturePatient("pat_disease_test_a", "Disease Test A");
const patientB = fixturePatient("pat_disease_test_b", "Disease Test B");

beforeEach(() => {
  currentRole.value = "DOCTOR";
});

describe("disease group actions", () => {
  it("creates a list and seeds it with the consulting patient", async () => {
    await db.patients.insert(patientA);
    const res = await createDiseaseGroupAction("Rosacea", patientA.id);
    expect(res.ok).toBe(true);
    const group = (await db.diseaseGroups.get(res.data!.id))!;
    expect(group.name).toBe("Rosacea");
    expect(group.doctorId).toBe("doc_bhosikar");
    expect(group.patientIds).toContain(patientA.id);
  });

  it("refuses duplicate list names for the same doctor", async () => {
    const res = await createDiseaseGroupAction("rosacea");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/already have/i);
  });

  it("requires a usable name", async () => {
    const res = await createDiseaseGroupAction("x");
    expect(res.ok).toBe(false);
  });

  it("adds and removes a patient from a list", async () => {
    await db.patients.insert(patientB);
    const created = await createDiseaseGroupAction("Gout List");
    expect(created.ok).toBe(true);
    const groupId = created.data!.id;
    expect((await db.diseaseGroups.get(groupId))!.patientIds).not.toContain(patientB.id);

    const added = await setPatientInGroupAction(groupId, patientB.id, true);
    expect(added.ok).toBe(true);
    expect((await db.diseaseGroups.get(groupId))!.patientIds).toContain(patientB.id);

    const removed = await setPatientInGroupAction(groupId, patientB.id, false);
    expect(removed.ok).toBe(true);
    expect((await db.diseaseGroups.get(groupId))!.patientIds).not.toContain(patientB.id);
  });

  it("rejects unknown groups and patients", async () => {
    expect((await setPatientInGroupAction("dg_missing", patientB.id, true)).ok).toBe(false);
    const created = await createDiseaseGroupAction("Acne List");
    expect((await setPatientInGroupAction(created.data!.id, "pat_missing", true)).ok).toBe(false);
  });

  it("denies patients without patient-edit rights", async () => {
    currentRole.value = "PATIENT";
    const res = await setPatientInGroupAction("dg_whatever", "pat_whatever", true);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/permission/i);
  });
});
