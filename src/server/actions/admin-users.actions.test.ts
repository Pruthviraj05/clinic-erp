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
const { users, findUserByEmail, verifyPassword } = await import("@/server/demo/users-store");

function fd(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.append(k, v);
  return form;
}

beforeEach(() => {
  currentRole.value = "ADMIN";
});

describe("admin creates admin", () => {
  it("creates an administrator whose password verifies", async () => {
    const res = await createAdminAction(
      null,
      fd({ fullName: "Priya Deshmukh", email: "priya.admin@clinicore.app", password: "Strong@123" }),
    );
    expect(res.ok).toBe(true);

    const created = findUserByEmail("priya.admin@clinicore.app")!;
    expect(created.role).toBe("ADMIN");
    expect(created.isActive).toBe(true);
    expect(created.passwordHash).not.toContain("Strong@123");
    expect(verifyPassword("Strong@123", created.passwordHash)).toBe(true);
    expect(verifyPassword("Strong@124", created.passwordHash)).toBe(false);
  });

  it("rejects duplicate emails", async () => {
    const res = await createAdminAction(
      null,
      fd({ fullName: "Copy Cat", email: "priya.admin@clinicore.app", password: "Strong@123" }),
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

  it("deactivates and reactivates an account", async () => {
    const target = findUserByEmail("priya.admin@clinicore.app")!;
    expect((await setUserActiveAction(target.id, false)).ok).toBe(true);
    expect(target.isActive).toBe(false);
    expect((await setUserActiveAction(target.id, true)).ok).toBe(true);
    expect(target.isActive).toBe(true);
  });

  it("never leaves the clinic without an active administrator", async () => {
    const admins = users.filter((u) => u.role === "ADMIN" && u.isActive);
    // Deactivate all but one, then the last one must be refused.
    for (const a of admins.slice(1)) await setUserActiveAction(a.id, false);
    const last = users.filter((u) => u.role === "ADMIN" && u.isActive)[0];
    const res = await setUserActiveAction(last.id, false);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/at least one active administrator/i);
  });

  it("denies non-admin roles", async () => {
    currentRole.value = "DOCTOR";
    const res = await createAdminAction(
      null,
      fd({ fullName: "Sneaky Doc", email: "sneaky@clinicore.app", password: "Strong@123" }),
    );
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/permission/i);
  });
});
