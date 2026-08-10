import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Login hardening: lockout after repeated failures, no account enumeration,
 * and transparent upgrade of legacy password hashes.
 */
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { authenticate } = await import("./credentials");
const { hashPassword, verifyPassword, needsRehash } = await import("@/server/demo/users-store");
const { db } = await import("@/server/repositories");

const PASSWORD = "correct-horse-battery";

async function makeUser(email: string, overrides: Record<string, unknown> = {}) {
  const id = `usr_test_${email}`;
  await db.users.insert({
    id,
    fullName: "Test User",
    email,
    role: "ADMIN",
    passwordHash: hashPassword(PASSWORD),
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  });
  return id;
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("password hashing", () => {
  it("round-trips and rejects the wrong password", () => {
    const hash = hashPassword(PASSWORD);
    expect(verifyPassword(PASSWORD, hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("stores the cost parameters so they can be raised later", () => {
    const hash = hashPassword(PASSWORD);
    expect(hash.split("$")).toHaveLength(6); // scrypt$N$r$p$salt$hash
    expect(needsRehash(hash)).toBe(false);
  });

  it("still verifies legacy hashes, and flags them for re-hashing", () => {
    // The shipped seed admin hash, made with Node's default N=16384.
    const legacy =
      "scrypt$7932b2e116b076a54f452848eaabd585$06000d0d587e8c9f8e4837807bfb98b9771cac636d018468d93212910f423e64";
    expect(verifyPassword("Test@12345", legacy)).toBe(true);
    expect(verifyPassword("nope", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });

  it("rejects malformed hashes instead of throwing", () => {
    expect(verifyPassword(PASSWORD, "")).toBe(false);
    expect(verifyPassword(PASSWORD, "bcrypt$x$y")).toBe(false);
    expect(verifyPassword(PASSWORD, "scrypt$notanumber$8$1$aa$bb")).toBe(false);
  });
});

describe("authenticate", () => {
  it("signs in with the right password", async () => {
    const id = await makeUser("ok@test.local");
    const res = await authenticate("ok@test.local", PASSWORD);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.user.id).toBe(id);
  });

  it("matches the email case-insensitively", async () => {
    await makeUser("case@test.local");
    expect((await authenticate("  CASE@Test.Local ", PASSWORD)).ok).toBe(true);
  });

  it("gives the same message for a wrong password and a missing account", async () => {
    await makeUser("enum@test.local");
    const wrongPassword = await authenticate("enum@test.local", "nope");
    const noAccount = await authenticate("ghost@test.local", "nope");
    expect(wrongPassword.ok).toBe(false);
    expect(noAccount.ok).toBe(false);
    // Differing messages would let an attacker enumerate valid emails.
    expect(wrongPassword.ok === false && wrongPassword.message).toBe(
      noAccount.ok === false && noAccount.message,
    );
  });

  // Six sign-in attempts, each doing a deliberately slow scrypt hash
  // (~200ms by design), so this needs more than the 5s default.
  it("locks the account after five failures, then refuses even the right password", async () => {
    await makeUser("lock@test.local");
    for (let i = 0; i < 4; i++) {
      expect((await authenticate("lock@test.local", "wrong")).ok).toBe(false);
    }
    const fifth = await authenticate("lock@test.local", "wrong");
    expect(fifth.ok).toBe(false);
    if (!fifth.ok) expect(fifth.lockedUntil).toBeTruthy();

    // Correct password must still be refused while locked.
    const locked = await authenticate("lock@test.local", PASSWORD);
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.message).toMatch(/too many failed attempts/i);
  }, 30_000);

  it("clears the failure count on a successful sign-in", async () => {
    const id = await makeUser("reset@test.local");
    await authenticate("reset@test.local", "wrong");
    await authenticate("reset@test.local", "wrong");
    expect((await db.users.get(id))!.failedAttempts).toBe(2);

    expect((await authenticate("reset@test.local", PASSWORD)).ok).toBe(true);
    expect((await db.users.get(id))!.failedAttempts).toBe(0);
  });

  it("refuses a deactivated account", async () => {
    await makeUser("off@test.local", { isActive: false });
    expect((await authenticate("off@test.local", PASSWORD)).ok).toBe(false);
  });

  it("upgrades a legacy hash on successful sign-in", async () => {
    const id = await makeUser("legacy@test.local", {
      passwordHash:
        "scrypt$7932b2e116b076a54f452848eaabd585$06000d0d587e8c9f8e4837807bfb98b9771cac636d018468d93212910f423e64",
    });
    expect((await authenticate("legacy@test.local", "Test@12345")).ok).toBe(true);

    const after = (await db.users.get(id))!;
    expect(needsRehash(after.passwordHash)).toBe(false);
    // Still the same password, just stored at the stronger cost.
    expect(verifyPassword("Test@12345", after.passwordHash)).toBe(true);
  });
});
