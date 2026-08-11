"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120).optional(),
  phone: z.string().trim().max(20).optional(),
  qualifications: z.string().trim().max(200).optional(),
  registrationNo: z.string().trim().max(60).optional(),
});

/**
 * Every role edits their own basic details here. For a doctor, qualifications
 * and registration number feed straight into the Rx and consent letterhead —
 * both already read them live from the Doctor record at print time, so this
 * needs no extra wiring downstream.
 *
 * A patient's legal name isn't editable here (it lives on the medical record
 * and changing it belongs at the front desk, not self-service); everyone
 * else can update it.
 */
export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session has expired. Sign in again." };
  const { user } = session;

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;
  const fullName = user.role !== "PATIENT" ? input.fullName : undefined;

  await db.users.update(user.id, {
    ...(fullName ? { fullName } : {}),
  });

  if (user.role === "DOCTOR" && user.linkId) {
    await db.doctors.update(user.linkId, {
      ...(fullName ? { fullName } : {}),
      phone: input.phone || undefined,
      qualifications: input.qualifications || null,
      registrationNo: input.registrationNo || null,
    });
  } else if (user.role === "RECEPTIONIST" && user.linkId) {
    await db.receptionists.update(user.linkId, {
      ...(fullName ? { fullName } : {}),
      phone: input.phone || undefined,
    });
  } else if (user.role === "PATIENT" && user.linkId) {
    await db.patients.update(user.linkId, {
      phone: input.phone || undefined,
    });
  }

  await logAudit({
    actor: fullName ?? user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "Profile",
    summary: "Updated their profile details",
  });

  revalidatePath("/profile");
  revalidatePath("/doctor/rx-design");
  return { ok: true, message: "Profile updated." };
}
