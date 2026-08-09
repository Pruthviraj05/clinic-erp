import { describe, it, expect } from "vitest";
import { ADMIN_SEED_USER, hashPassword, verifyPassword } from "./users-store";
import { db } from "@/server/repositories";

describe("credentials store (auth-ready)", () => {
  it("verifies the seeded admin password and rejects wrong ones", () => {
    expect(ADMIN_SEED_USER.email).toBe("admin@gmail.com");
    expect(verifyPassword("Test@12345", ADMIN_SEED_USER.passwordHash)).toBe(true);
    expect(verifyPassword("wrong-password", ADMIN_SEED_USER.passwordHash)).toBe(false);
  });

  it("looks up accounts case-insensitively via db.users", async () => {
    const accounts = await db.users.list();
    const found = accounts.find((u) => u.email.toLowerCase() === "ADMIN@Gmail.com".toLowerCase());
    expect(found?.id).toBe(ADMIN_SEED_USER.id);
    expect(accounts.find((u) => u.email.toLowerCase() === "nobody@example.com")).toBeUndefined();
  });

  it("hashes with a unique salt each time", () => {
    const a = hashPassword("Sample@123");
    const b = hashPassword("Sample@123");
    expect(a).not.toBe(b);
    expect(verifyPassword("Sample@123", a)).toBe(true);
    expect(verifyPassword("Sample@123", b)).toBe(true);
  });

  it("adds new accounts with generated ids via db.users", async () => {
    const before = (await db.users.list()).length;
    const created = await db.users.insert({
      id: `usr_${Date.now().toString(36)}`,
      fullName: "Test Admin",
      email: "test.admin@clinicore.app",
      role: "ADMIN",
      passwordHash: hashPassword("Test@1234"),
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    expect((await db.users.list()).length).toBe(before + 1);
    expect(created.id).toMatch(/^usr_/);
    const found = (await db.users.list()).find((u) => u.email === "test.admin@clinicore.app");
    expect(found?.id).toBe(created.id);
  });
});
