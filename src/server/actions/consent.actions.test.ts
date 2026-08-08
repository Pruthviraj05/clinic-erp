import { describe, it, expect, vi, beforeEach } from "vitest";

const currentRole = { value: "RECEPTIONIST" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { createConsentAction, updateConsentAction, signConsentAction } = await import("./consent.actions");
const { consentForms } = await import("@/server/demo/extra");

function fd(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.append(k, v);
  return form;
}

beforeEach(() => {
  currentRole.value = "RECEPTIONIST";
});

describe("reception consent workflow", () => {
  it("creates a form with the assigned doctor and basic info", async () => {
    const res = await createConsentAction(
      null,
      fd({
        patientId: "pat_diya",
        doctorId: "doc_rao",
        title: "Consent for Thyroid Investigation",
        body: "I consent to the blood investigations advised by my physician for thyroid evaluation.",
        details: "Fasting sample. No known allergies.",
      }),
    );

    expect(res.ok).toBe(true);
    const created = consentForms.find((c) => c.id === res.data!.id)!;
    expect(created.patientName).toBe("Diya Patel");
    expect(created.doctorId).toBe("doc_rao");
    expect(created.doctorName).toBe("Dr. Vikram Rao");
    expect(created.details).toContain("Fasting sample");
    expect(created.status).toBe("PENDING");
    expect(created.createdBy).toBeTruthy();
  });

  it("rejects incomplete forms with field errors", async () => {
    const res = await createConsentAction(null, fd({ patientId: "", doctorId: "", title: "x", body: "short" }));
    expect(res.ok).toBe(false);
    expect(res.fieldErrors).toBeDefined();
  });

  it("lets the assigned doctor edit an unsigned form", async () => {
    currentRole.value = "DOCTOR";
    const target = consentForms.find((c) => c.doctorId === "doc_mehta" && c.status === "PENDING")!;
    const res = await updateConsentAction(
      null,
      fd({
        id: target.id,
        doctorId: "doc_mehta",
        title: target.title,
        body: target.body,
        details: "Peel strength reduced to 20% after review.",
      }),
    );
    expect(res.ok).toBe(true);
    expect(target.details).toContain("20%");
    expect(target.updatedAt).toBeTruthy();
  });

  it("blocks a doctor from editing another doctor's form", async () => {
    currentRole.value = "DOCTOR";
    const other = consentForms.find((c) => c.doctorId === "doc_rao" && c.status !== "SIGNED")!;
    const res = await updateConsentAction(
      null,
      fd({ id: other.id, doctorId: "doc_rao", title: other.title, body: other.body }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/assigned to you/i);
  });

  it("locks editing once the patient has signed", async () => {
    const signed = consentForms.find((c) => c.status === "SIGNED")!;
    const res = await updateConsentAction(
      null,
      fd({ id: signed.id, doctorId: "doc_mehta", title: signed.title, body: signed.body }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/no longer be edited/i);
  });

  it("only lets a patient sign their own form", async () => {
    currentRole.value = "PATIENT";
    const notMine = consentForms.find((c) => c.patientId !== "pat_arjun" && c.status === "PENDING")!;
    const res = await signConsentAction(notMine.id, "data:image/png;base64,AAA");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/your own/i);
  });
});
