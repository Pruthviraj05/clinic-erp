"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from "@/lib/session";
import { db } from "@/server/repositories";
import { hashPassword, verifyPassword } from "@/server/demo/users-store";
import { logAudit } from "@/server/demo/extra";
import { ROLE_HOME } from "@/lib/rbac";
import { passwordSchema } from "@/lib/auth/password-policy";
import type { ActionResult } from "./appointment.actions";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password you have not used here before",
    path: ["newPassword"],
  });

/**
 * Change your own password.
 *
 * Bumps `sessionVersion`, which invalidates every session issued before the
 * change — so if the old password had leaked, any session opened with it dies
 * immediately. The current browser is re-issued a fresh token.
 */
export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session has expired. Sign in again." };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  const account = await db.users.get(session.user.id);
  if (!account) return { ok: false, message: "Account not found." };

  if (!verifyPassword(currentPassword, account.passwordHash)) {
    return {
      ok: false,
      message: "Your current password is incorrect.",
      fieldErrors: { currentPassword: ["Incorrect password"] },
    };
  }

  const nextVersion = (account.sessionVersion ?? 1) + 1;
  await db.users.update(account.id, {
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
    passwordChangedAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: undefined,
    sessionVersion: nextVersion,
  });

  // Keep THIS browser signed in with a token carrying the new version.
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(account.id, nextVersion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  await logAudit({
    actor: account.fullName,
    role: account.role,
    action: "UPDATE",
    entity: "UserAccount",
    // Never record the password itself, only that it changed.
    summary: `Password changed for ${account.email}`,
  });

  redirect(ROLE_HOME[account.role]);
}
