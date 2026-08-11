import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Booking-source tracking: how an appointment was booked (walk-in/phone/
 * website/referral) is separate from its consultation `type`. Patients can
 * only ever be booking through the portal, whatever the form says.
 */
const currentRole = { value: "RECEPTIONIST" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "clinicore_role" ? { name, value: currentRole.value } : undefined),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { createAppointmentAction } = await import("./appointment.actions");
const { db } = await import("@/server/repositories");

beforeEach(() => {
  currentRole.value = "RECEPTIONIST";
});

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

const BASE = {
  branchId: "br_ravet",
  patientId: "pat_demo",
  doctorId: "doc_bhosikar",
  type: "SCHEDULED",
  date: "2026-09-01",
  durationMinutes: "15",
};

describe("createAppointmentAction — booking source", () => {
  it("defaults to WALK_IN when reception doesn't pick a source", async () => {
    const res = await createAppointmentAction(null, fd({ ...BASE, time: "09:00" }));
    expect(res.ok).toBe(true);
    expect(res.data!.source).toBe("WALK_IN");
  });

  it("records an explicit source", async () => {
    const res = await createAppointmentAction(null, fd({ ...BASE, time: "09:15", source: "PHONE" }));
    expect(res.ok).toBe(true);
    expect(res.data!.source).toBe("PHONE");
  });

  it("forces WEBSITE for a patient self-booking, ignoring whatever the form posts", async () => {
    currentRole.value = "PATIENT";
    const res = await createAppointmentAction(null, fd({ ...BASE, time: "09:30", source: "PHONE" }));
    expect(res.ok).toBe(true);
    expect(res.data!.source).toBe("WEBSITE");
  });

  it("rejects an invalid source value", async () => {
    const res = await createAppointmentAction(null, fd({ ...BASE, time: "09:45", source: "CARRIER_PIGEON" }));
    expect(res.ok).toBe(false);
  });
});
