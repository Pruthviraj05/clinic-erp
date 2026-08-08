"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { addMedicine, applyStockChange, lowStockItems, updateMedicine } from "@/server/demo/inventory-store";
import { notifications } from "@/server/demo/data";
import { logAudit } from "@/server/demo/extra";
import { addMedicineSchema, adjustStockSchema, editMedicineSchema } from "@/features/inventory/schema";
import type { ActionResult } from "./appointment.actions";
import type { Medicine } from "@/types/domain";

export async function addMedicineAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Medicine>> {
  const authz = await authorize("inventory", "create");
  if (!authz.ok) return authz;
  const { session } = authz;
  const parsed = addMedicineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const med = addMedicine({ ...parsed.data, by: session.user.fullName });
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Added ${med.name}.`, data: med };
}

export async function adjustStockAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const authz = await authorize("inventory", "edit");
  if (!authz.ok) return authz;
  const { session } = authz;
  const parsed = adjustStockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { medicineId, direction, quantity, reason } = parsed.data;
  const delta = direction === "IN" ? quantity : -quantity;
  const res = applyStockChange(medicineId, delta, direction === "IN" ? "IN" : "OUT", reason, session.user.fullName);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Stock ${direction === "IN" ? "added" : "removed"}. New balance: ${res.balanceAfter}.` };
}

export async function updateMedicineAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Medicine>> {
  const authz = await authorize("inventory", "edit");
  if (!authz.ok) return authz;
  const { session } = authz;
  const parsed = editMedicineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { id, name, genericName, category, brand, unit, reorderLevel, sellPrice } = parsed.data;
  const med = updateMedicine(
    id,
    {
      name,
      genericName: genericName || null,
      category: category || null,
      brand: brand || null,
      unit,
      reorderLevel,
      sellPrice: Math.round(sellPrice * 100) / 100,
    },
    session.user.fullName,
  );
  if (!med) return { ok: false, message: "Medicine not found." };
  logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "UPDATE",
    entity: "Medicine",
    summary: `Updated details for ${med.name}`,
  });
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Updated ${med.name}.`, data: med };
}

/** Soft activate/deactivate a medicine. Deactivation requires delete rights. */
export async function setMedicineActiveAction(id: string, active: boolean): Promise<ActionResult<Medicine>> {
  const authz = await authorize("inventory", active ? "edit" : "delete");
  if (!authz.ok) return authz;
  const { session } = authz;
  const med = updateMedicine(id, { isActive: active }, session.user.fullName);
  if (!med) return { ok: false, message: "Medicine not found." };
  logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "STATUS_CHANGE",
    entity: "Medicine",
    summary: `${active ? "Reactivated" : "Deactivated"} ${med.name}`,
  });
  revalidatePath("/admin/inventory");
  return { ok: true, message: `${med.name} ${active ? "reactivated" : "deactivated"}.`, data: med };
}

/**
 * Trigger low-stock alerts (simulated WhatsApp + email to admins). Creates the
 * notifications that would otherwise be sent by the notification worker.
 */
export async function sendLowStockAlertAction(): Promise<ActionResult<{ count: number }>> {
  const authz = await authorize("inventory", "edit");
  if (!authz.ok) return authz;
  const low = lowStockItems();
  if (low.length === 0) return { ok: true, message: "No low-stock items to alert.", data: { count: 0 } };

  const now = new Date().toISOString();
  for (const m of low) {
    notifications.unshift({
      id: `ntf_low_${m.id}_${Date.now()}`,
      type: "INVENTORY_LOW_STOCK",
      channel: "WHATSAPP",
      title: "Low stock alert sent",
      body: `${m.name} is at ${m.stockQty} ${m.unit} (reorder ${m.reorderLevel}). WhatsApp + email sent to admins.`,
      status: "SENT",
      createdAt: now,
      read: false,
    });
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/notifications");
  return { ok: true, message: `Alerts sent for ${low.length} item(s) via WhatsApp & email.`, data: { count: low.length } };
}
