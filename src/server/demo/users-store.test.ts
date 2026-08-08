import { describe, it, expect } from "vitest";
import { addUser, findUserByEmail, hashPassword, users, verifyPassword } from "./users-store";

describe("credentials store (auth-ready)", () => {
  it("verifies the seeded demo password and rejects wrong ones", () => {
    const admin = findUserByEmail("admin@clinicore.app");
    expect(admin).toBeDefined();
    expect(verifyPassword("Clinic@123", admin!.passwordHash)).toBe(true);
    expect(verifyPassword("wrong-password", admin!.passwordHash)).toBe(false);
  });

  it("looks up accounts case-insensitively", () => {
    expect(findUserByEmail("ADMIN@Clinicore.App")?.id).toBe("usr_admin_neha");
    expect(findUserByEmail("nobody@example.com")).toBeUndefined();
  });

  it("hashes with a unique salt each time", () => {
    const a = hashPassword("Sample@123");
    const b = hashPassword("Sample@123");
    expect(a).not.toBe(b);
    expect(verifyPassword("Sample@123", a)).toBe(true);
    expect(verifyPassword("Sample@123", b)).toBe(true);
  });

  it("adds new accounts with generated ids", () => {
    const before = users.length;
    const created = addUser({
      fullName: "Test Admin",
      email: "test.admin@clinicore.app",
      role: "ADMIN",
      passwordHash: hashPassword("Test@1234"),
      isActive: true,
    });
    expect(users.length).toBe(before + 1);
    expect(created.id).toMatch(/^usr_/);
    expect(findUserByEmail("test.admin@clinicore.app")?.id).toBe(created.id);
  });
});
