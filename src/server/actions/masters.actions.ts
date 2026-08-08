"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { logAudit, type MasterRow } from "@/server/demo/extra";
import type { ActionResult } from "./appointment.actions";

/** Groups that can be edited. "consultation-fees" is derived from doctors and is read-only. */
const EDITABLE_GROUPS = [
  "departments",
  "specializations",
  "medicine-categories",
  "lab-tests",
  "investigations",
  "suppliers",
  "tax-rates",
] as const;

const saveMasterRowSchema = z.object({
  id: z.string().optional(),
  group: z.enum(EDITABLE_GROUPS),
  name: z.string().min(1, "Name is required").max(120),
  meta: z.string().max(160).optional(),
});

let seq = 100;
function nextId() {
  seq += 1;
  return `ms_${Date.now()}_${seq}`;
}

/** Create (no id) or update (hidden id) a master row for the given group. */
export async function saveMasterRowAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<MasterRow>> {
  const parsed = saveMasterRowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { id, group, name, meta } = parsed.data;

  const authz = await authorize("masters", id ? "edit" : "create");
  if (!authz.ok) return authz;
  const { session } = authz;

  const store = db.masters[group];
  if (!store) return { ok: false, message: "Unknown master group." };

  if (id) {
    const updated = await store.update(id, { name, meta: meta || undefined });
    if (!updated) return { ok: false, message: "Entry not found." };
    logAudit({
      actor: session.user.fullName,
      role: session.user.role,
      action: "UPDATE",
      entity: "Master",
      summary: `Updated ${group} entry "${name}"`,
    });
    revalidatePath("/admin/masters");
    return { ok: true, message: `Updated ${name}.`, data: updated };
  }

  const row: MasterRow = { id: nextId(), name, meta: meta || undefined, active: true };
  await store.insert(row);
  logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "CREATE",
    entity: "Master",
    summary: `Added ${group} entry "${name}"`,
  });
  revalidatePath("/admin/masters");
  return { ok: true, message: `Added ${name}.`, data: row };
}

/** Soft activate/deactivate a master row. Deactivation requires delete rights. */
export async function toggleMasterActiveAction(
  group: string,
  id: string,
  active: boolean,
): Promise<ActionResult<MasterRow>> {
  if (!(EDITABLE_GROUPS as readonly string[]).includes(group)) {
    return { ok: false, message: "This group cannot be edited." };
  }
  const authz = await authorize("masters", active ? "edit" : "delete");
  if (!authz.ok) return authz;
  const { session } = authz;

  const store = db.masters[group];
  if (!store) return { ok: false, message: "Unknown master group." };

  const updated = await store.update(id, { active });
  if (!updated) return { ok: false, message: "Entry not found." };

  logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "STATUS_CHANGE",
    entity: "Master",
    summary: `${active ? "Reactivated" : "Deactivated"} ${group} entry "${updated.name}"`,
  });
  revalidatePath("/admin/masters");
  return { ok: true, message: `${updated.name} ${active ? "reactivated" : "deactivated"}.`, data: updated };
}
