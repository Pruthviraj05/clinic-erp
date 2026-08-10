import { describe, it, expect, vi, beforeEach } from "vitest";

const currentRole = { value: "ADMIN" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "clinicore_role" ? { name, value: currentRole.value } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { createAdminAction, setUserActiveAction } = await import("./admin-users.actions");
const { verifyPassword } = await import("@/server/demo/users-store");
const { db } = await import("@/server/repositories");

function fd(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.append(k, v);
  return form;
}

async function findByEmail(email: string) {
  const accounts = await db.users.list();
  return accounts.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

beforeEach(() => {
  currentRole.value = "ADMIN";
});

describe("admin creates admin", () => {
  it("creates an administrator whose password verifies", async () => {
    const res = await createAdminAction(
      null,
      fd({ fullName: "Priya Deshmukh", email: "priya.admin@clinicore.app", password: "Str0ng-Passphrase!" }),
    );
    expect(res.ok).toBe(true);

    const created = (await findByEmail("priya.admin@clinicore.app"))!;
    expect(created.role).toBe("ADMIN");
    expect(created.isActive).toBe(true);
    expect(created.passwordHash).not.toContain("Str0ng-Passphrase!");
    expect(verifyPassword("Str0ng-Passphrase!", created.passwordHash)).toBe(true);
    expect(verifyPassword("Wr0ng-Passphrase!", created.passwordHash)).toBe(false);
  });

  it("rejects duplicate emails", async () => {
    const res = await createAdminAction(
      null,
      fd({ fullName: "Copy Cat", email: "priya.admin@clinicore.app", password: "Str0ng-Passphrase!" }),
    );
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.email).toBeDefined();
  });

  it("enforces password strength", async () => {
    const res = await createAdminAction(
      null,
      fd({ fullName: "Weak Pass", email: "weak@clinicore.app", password: "short" }),
    );
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.password).toBeDefined();
  });

  it("rejects passwords under the 12-character minimum", async () => {
    // "Strong@123" satisfied the old min(8)+letter+digit rule; length is what
    // actually resists guessing, so the policy is now length-first.
    const res = await createAdminAction(
      null,
      fd({ fullName: "Old Policy", email: "oldpolicy@clinicore.app", password: "Strong@123" }),
    );
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.password?.[0]).toMatch(/12 characters/i);
  });

  it("forces a password change on a newly created admin", async () => {
    const created = (await findByEmail("priya.admin@clinicore.app"))!;
    expect(created.mustChangePassword).toBe(true);
  });

  it("revokes live sessions when an account is deactivated", async () => {
    const target = (await findByEmail("priya.admin@clinicore.app"))!;
    const before = target.sessionVersion ?? 1;
    await setUserActiveAction(target.id, false);
    const after = (await db.users.get(target.id))!;
    expect(after.sessionVersion).toBeGreaterThan(before);
    await setUserActiveAction(target.id, true);
  });

  it("deactivates and reactivates an account", async () => {
    const target = (await findByEmail("priya.admin@clinicore.app"))!;
    expect((await setUserActiveAction(target.id, false)).ok).toBe(true);
    expect((await db.users.get(target.id))!.isActive).toBe(false);
    expect((await setUserActiveAction(target.id, true)).ok).toBe(true);
    expect((await db.users.get(target.id))!.isActive).toBe(true);
  });

  it("never leaves the clinic without an active administrator", async () => {
    // ADMIN_SEED_USER (admin@gmail.com) plus the "priya.admin" account created
    // above are both active admins at this point.
    const admins = (await db.users.list()).filter((u) => u.role === "ADMIN" && u.isActive);
    expect(admins.length).toBeGreaterThan(1);
    for (const a of admins.slice(1)) await setUserActiveAction(a.id, false);
    const remaining = (await db.users.list()).filter((u) => u.role === "ADMIN" && u.isActive);
    expect(remaining).toHaveLength(1);
    const res = await setUserActiveAction(remaining[0].id, false);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/at least one active administrator/i);
  });

  it("denies non-admin roles", async () => {
    currentRole.value = "DOCTOR";
    const res = await createAdminAction(
      null,
      fd({ fullName: "Sneaky Doc", email: "sneaky@clinicore.app", password: "Str0ng-Passphrase!" }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/permission/i);
  });
});
