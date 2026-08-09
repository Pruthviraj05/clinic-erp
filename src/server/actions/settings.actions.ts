"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import type { ActionResult } from "./appointment.actions";

/** Save the customizable prescription header/footer + toggles (admin only). */
export async function savePrescriptionTemplateAction(input: {
  headerNote: string;
  footerNote: string;
  showQr: boolean;
  showVitals: boolean;
}): Promise<ActionResult> {
  const authz = await authorize("settings", "edit");
  if (!authz.ok) return authz;

  const current = await db.settings.get();
  await db.settings.set({
    ...current,
    headerNote: input.headerNote.slice(0, 300),
    footerNote: input.footerNote.slice(0, 500),
    showQr: input.showQr,
    showVitals: input.showVitals,
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: "Prescription template saved." };
}
