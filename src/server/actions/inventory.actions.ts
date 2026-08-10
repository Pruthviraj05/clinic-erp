"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { addMedicine, applyStockChange, lowStockItems, updateMedicine } from "@/server/demo/inventory-store";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import {
  addMedicineSchema,
  adjustStockSchema,
  editMedicineSchema,
  importStockSchema,
  type ImportStockInput,
} from "@/features/inventory/schema";
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
  const med = await addMedicine({ ...parsed.data, by: session.user.fullName });
  await logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "CREATE",
    entity: "Medicine",
    summary: `Added medicine ${med.name}`,
  });
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
  const { medicineId, direction, quantity, reason, billPhotoDataUrl } = parsed.data;
  const delta = direction === "IN" ? quantity : -quantity;
  const res = await applyStockChange(
    medicineId,
    delta,
    direction === "IN" ? "IN" : "OUT",
    reason,
    session.user.fullName,
    { billPhotoDataUrl },
  );
  if (!res.ok) return { ok: false, message: res.message };
  await logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "UPDATE",
    entity: "Medicine",
    summary: `Stock ${direction === "IN" ? "added" : "removed"} — new balance ${res.balanceAfter}`,
  });
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
  const med = await updateMedicine(
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
  await logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "UPDATE",
    entity: "Medicine",
    summary: `Updated details for ${med.name}`,
  });
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Updated ${med.name}.`, data: med };
}

export interface ImportStockSummary {
  created: number;
  toppedUp: number;
  failed: { name: string; reason: string }[];
}

/**
 * Bulk stock-in from a CSV/Excel upload (optionally with the supplier's bill
 * photo attached to every movement it creates).
 *
 * Rows carrying a `medicineId` top up an existing medicine; rows without one
 * create a new medicine using the row's quantity as opening stock. Each row is
 * applied independently — one bad row is reported back rather than discarding
 * the whole import, since a part-applied import is still visible in the
 * movement log and can be corrected, whereas silently dropping 200 good rows
 * because of one typo is worse.
 */
export async function importStockAction(
  payload: ImportStockInput,
): Promise<ActionResult<ImportStockSummary>> {
  const authz = await authorize("inventory", "create");
  if (!authz.ok) return authz;
  const { session } = authz;

  const parsed = importStockSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "The import could not be validated." };
  }
  const { rows, reference, billPhotoDataUrl } = parsed.data;
  const by = session.user.fullName;
  const reason = reference?.trim() ? `Stock in — ${reference.trim()}` : "Stock in — bulk import";

  const summary: ImportStockSummary = { created: 0, toppedUp: 0, failed: [] };

  for (const row of rows) {
    try {
      if (row.medicineId) {
        const res = await applyStockChange(row.medicineId, row.quantity, "IN", reason, by, { billPhotoDataUrl });
        if (res.ok) summary.toppedUp += 1;
        else summary.failed.push({ name: row.name, reason: res.message });
        continue;
      }
      await addMedicine({
        name: row.name,
        genericName: row.genericName,
        category: row.category,
        brand: row.brand,
        unit: row.unit || "Unit",
        reorderLevel: row.reorderLevel ?? 0,
        sellPrice: row.sellPrice ?? 0,
        openingStock: row.quantity,
        by,
        reason,
        billPhotoDataUrl,
      });
      summary.created += 1;
    } catch {
      summary.failed.push({ name: row.name, reason: "Could not be saved." });
    }
  }

  if (summary.created === 0 && summary.toppedUp === 0) {
    return { ok: false, message: "Nothing was imported. Check the highlighted rows and try again.", data: summary };
  }

  await logAudit({
    actor: by,
    role: session.user.role,
    action: "CREATE",
    entity: "Medicine",
    summary: `Stock import — ${summary.created} new, ${summary.toppedUp} topped up${summary.failed.length ? `, ${summary.failed.length} failed` : ""}${reference ? ` (${reference})` : ""}`,
  });

  revalidatePath("/admin/inventory");
  const parts = [
    summary.created ? `${summary.created} new medicine(s)` : null,
    summary.toppedUp ? `${summary.toppedUp} restocked` : null,
    summary.failed.length ? `${summary.failed.length} failed` : null,
  ].filter(Boolean);
  return { ok: true, message: `Import complete — ${parts.join(", ")}.`, data: summary };
}

/** Soft activate/deactivate a medicine. Deactivation requires delete rights. */
export async function setMedicineActiveAction(id: string, active: boolean): Promise<ActionResult<Medicine>> {
  const authz = await authorize("inventory", active ? "edit" : "delete");
  if (!authz.ok) return authz;
  const { session } = authz;
  const med = await updateMedicine(id, { isActive: active }, session.user.fullName);
  if (!med) return { ok: false, message: "Medicine not found." };
  await logAudit({
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
  const low = await lowStockItems();
  if (low.length === 0) return { ok: true, message: "No low-stock items to alert.", data: { count: 0 } };

  const now = new Date().toISOString();
  for (const m of low) {
    await db.notifications.insert({
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
