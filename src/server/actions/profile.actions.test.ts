import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type { UserAccount } from "@/server/demo/users-store";

/**
 * Every role edits their own basic details through one action. A patient's
 * legal name must stay read-only here (front desk changes it, not the
 * patient); a doctor's qualifications/registration number are what the Rx
 * and consent letterheads read live, so they matter most.
 */
const currentRole = { value: "DOCTOR" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "clinicore_role" ? { name, value: currentRole.value } : undefined),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { updateProfileAction } = await import("./profile.actions");
const { db } = await import("@/server/repositories");

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

beforeEach(() => {
  currentRole.value = "DOCTOR";
});

// The demo role-switcher's synthetic session (see server/demo/data.ts
// DEMO_USERS) resolves an id/linkId pair independent of the `users`
// collection — "usr_doc_bhosikar" happens to coincide with a real seeded
// account, but "usr_rec_demo" / "usr_pat_demo" don't back any row unless one
// is inserted, same as it would be for a real receptionist/patient login.
function accountFixture(over: Partial<UserAccount>): UserAccount {
  return {
    id: "acct", fullName: "Fixture", email: "fixture@example.com", role: "PATIENT",
    passwordHash: "scrypt$1$1$1$00$00", isActive: true, createdAt: new Date().toISOString(),
    ...over,
  };
}

beforeAll(async () => {
  await db.users.insert(accountFixture({ id: "usr_rec_demo", role: "RECEPTIONIST", fullName: "Reception (demo)" }));
  await db.users.insert(accountFixture({ id: "usr_pat_demo", role: "PATIENT", fullName: "Patient (demo)" }));
});

describe("updateProfileAction — doctor", () => {
  it("updates name, phone, qualifications and registration number", async () => {
    const res = await updateProfileAction(
      null,
      fd({
        fullName: "Dr. Abhijeet Bhosikar Jr.",
        phone: "+91 90000 11111",
        qualifications: "MBBS, MD, DM (Rheumatology)",
        registrationNo: "MH-99999",
      }),
    );
    expect(res.ok).toBe(true);

    const account = await db.users.get("usr_doc_bhosikar");
    expect(account!.fullName).toBe("Dr. Abhijeet Bhosikar Jr.");

    const doctor = await db.doctors.get("doc_bhosikar");
    expect(doctor!.fullName).toBe("Dr. Abhijeet Bhosikar Jr.");
    expect(doctor!.phone).toBe("+91 90000 11111");
    expect(doctor!.qualifications).toBe("MBBS, MD, DM (Rheumatology)");
    expect(doctor!.registrationNo).toBe("MH-99999");
  });

  it("clears qualifications/registration number when left blank", async () => {
    await updateProfileAction(null, fd({ fullName: "Dr. A", qualifications: "MBBS" }));
    const res = await updateProfileAction(null, fd({ fullName: "Dr. A" }));
    expect(res.ok).toBe(true);
    const doctor = await db.doctors.get("doc_bhosikar");
    expect(doctor!.qualifications).toBeNull();
  });
});

describe("updateProfileAction — patient", () => {
  it("ignores a posted full name but still updates phone", async () => {
    currentRole.value = "PATIENT";
    const before = await db.users.get("usr_pat_demo");
    const res = await updateProfileAction(
      null,
      fd({ fullName: "Someone Else Entirely", phone: "+91 70000 22222" }),
    );
    expect(res.ok).toBe(true);

    const account = await db.users.get("usr_pat_demo");
    expect(account!.fullName).toBe(before!.fullName); // unchanged

    const patient = await db.patients.get("pat_demo");
    expect(patient!.phone).toBe("+91 70000 22222");
  });
});

describe("updateProfileAction — receptionist", () => {
  it("updates name and phone", async () => {
    currentRole.value = "RECEPTIONIST";
    const res = await updateProfileAction(null, fd({ fullName: "Priya K.", phone: "+91 60000 33333" }));
    expect(res.ok).toBe(true);
    const account = await db.users.get("usr_rec_demo");
    expect(account!.fullName).toBe("Priya K.");
  });
});

describe("updateProfileAction — session handling", () => {
  it("rejects when there is no resolvable session", async () => {
    currentRole.value = "NOT_A_REAL_ROLE";
    const res = await updateProfileAction(null, fd({ fullName: "Whoever" }));
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/session/i);
  });

  it("rejects a name that's too short", async () => {
    currentRole.value = "DOCTOR";
    const res = await updateProfileAction(null, fd({ fullName: "A" }));
    expect(res.ok).toBe(false);
    expect(res.fieldErrors).toBeDefined();
  });
});
