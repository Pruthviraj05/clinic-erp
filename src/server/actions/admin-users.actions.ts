"use server";

import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { hashPassword } from "@/server/demo/users-store";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import type { UserAccount } from "@/server/demo/users-store";
import type { ActionResult } from "./appointment.actions";

/**
 * Administrator account management (admin-only, via the roles module).
 * Real accounts — sign-in-able whenever `NEXT_PUBLIC_AUTH_MODE=credentials`.
 */

const adminSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
});

export async function createAdminAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const authz = await authorize("roles", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = adminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  // Emails are stored lower-cased so the indexed login lookup matches.
  const normalized = input.email.trim().toLowerCase();
  const existing = await db.users.find({ email: normalized }, { limit: 1 });
  if (existing.length) {
    return { ok: false, message: "An account with that email already exists.", fieldErrors: { email: ["Already in use"] } };
  }

  const created: UserAccount = {
    id: newId("usr"),
    fullName: input.fullName,
    email: normalized,
    role: "ADMIN",
    passwordHash: hashPassword(input.password),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  await db.users.insert(created);

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "AdminUser",
    summary: `Created administrator ${created.fullName} (${created.email})`,
  });
  revalidatePath("/admin/admins");
  return { ok: true, message: `Administrator ${created.fullName} created.`, data: { id: created.id } };
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const authz = await authorize("roles", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const account = await db.users.get(id);
  if (!account) return { ok: false, message: "Account not found." };
  if (!active && account.role === "ADMIN") {
    const accounts = await db.users.list();
    if (accounts.filter((u) => u.role === "ADMIN" && u.isActive).length <= 1) {
      return { ok: false, message: "At least one active administrator is required." };
    }
  }

  await db.users.update(id, { isActive: active });
  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "STATUS_CHANGE",
    entity: "AdminUser",
    summary: `${active ? "Reactivated" : "Deactivated"} account ${account.email}`,
  });
  revalidatePath("/admin/admins");
  return { ok: true, message: `${account.fullName} ${active ? "reactivated" : "deactivated"}.` };
}
