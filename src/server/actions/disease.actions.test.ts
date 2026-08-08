import { describe, it, expect, vi, beforeEach } from "vitest";

const currentRole = { value: "DOCTOR" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { createDiseaseGroupAction, setPatientInGroupAction } = await import("./disease.actions");
const { diseaseGroups } = await import("@/server/demo/disease-store");

beforeEach(() => {
  currentRole.value = "DOCTOR";
});

describe("disease group actions", () => {
  it("creates a list and seeds it with the consulting patient", async () => {
    const res = await createDiseaseGroupAction("Rosacea", "pat_diya");
    expect(res.ok).toBe(true);
    const group = diseaseGroups.find((g) => g.id === res.data!.id)!;
    expect(group.name).toBe("Rosacea");
    expect(group.doctorId).toBe("doc_mehta");
    expect(group.patientIds).toContain("pat_diya");
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
    const group = diseaseGroups.find((g) => g.id === "dg_hairfall")!;
    expect(group.patientIds).not.toContain("pat_isha");

    const added = await setPatientInGroupAction("dg_hairfall", "pat_isha", true);
    expect(added.ok).toBe(true);
    expect(group.patientIds).toContain("pat_isha");

    const removed = await setPatientInGroupAction("dg_hairfall", "pat_isha", false);
    expect(removed.ok).toBe(true);
    expect(group.patientIds).not.toContain("pat_isha");
  });

  it("rejects unknown groups and patients", async () => {
    expect((await setPatientInGroupAction("dg_missing", "pat_isha", true)).ok).toBe(false);
    expect((await setPatientInGroupAction("dg_acne", "pat_missing", true)).ok).toBe(false);
  });

  it("denies patients without patient-edit rights", async () => {
    currentRole.value = "PATIENT";
    const res = await setPatientInGroupAction("dg_acne", "pat_arjun", true);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/permission/i);
  });
});
