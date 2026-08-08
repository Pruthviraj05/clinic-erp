"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { branches, doctors, invoices, patients } from "@/server/demo/data";
import { applyStockChange, findMedicine } from "@/server/demo/inventory-store";
import { logAudit } from "@/server/demo/extra";
import type { Invoice, InvoiceItem } from "@/types/domain";
import type { ActionResult } from "./appointment.actions";

/** GST applied to dispensed medicines (standard pharma slab). */
const PHARMACY_GST_RATE = 0.12;

/** Round to 2 decimals — money never leaves an action unrounded. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface PharmacyBillItem {
  medicineId: string;
  quantity: number;
}
export interface PharmacyBillPayload {
  patientId: string;
  branchId: string;
  items: PharmacyBillItem[];
}

/**
 * Generate a pharmacy bill and deduct the dispensed medicines from inventory.
 * Stock is validated up-front (all-or-nothing), then each line is deducted and
 * logged as a SALE movement stamped with the billing user.
 */
export async function createPharmacyBillAction(
  payload: PharmacyBillPayload,
): Promise<ActionResult<Invoice>> {
  const authz = await authorize("billing", "create");
  if (!authz.ok) return authz;
  const { session } = authz;

  const patient = patients.find((p) => p.id === payload.patientId);
  if (!patient) return { ok: false, message: "Please select a patient." };
  const branch = branches.find((b) => b.id === payload.branchId);
  if (!branch) return { ok: false, message: "Invalid branch." };

  const items = (payload.items ?? []).filter((i) => i.medicineId && i.quantity > 0);
  if (!items.length) return { ok: false, message: "Add at least one medicine." };

  // Aggregate per medicine first — the same medicine may appear on several
  // lines, and stock must cover the TOTAL, not each line independently.
  const needed = new Map<string, number>();
  for (const it of items) {
    needed.set(it.medicineId, (needed.get(it.medicineId) ?? 0) + it.quantity);
  }
  for (const [medicineId, totalQty] of needed) {
    const med = findMedicine(medicineId);
    if (!med) return { ok: false, message: "Invalid medicine selected." };
    if (med.stockQty < totalQty) {
      return { ok: false, message: `Insufficient stock for ${med.name} (only ${med.stockQty} ${med.unit}, bill needs ${totalQty}).` };
    }
  }

  const number = `INV-2026-${String(230 + invoices.length + 1).padStart(6, "0")}`;
  const lineItems: InvoiceItem[] = items.map((it) => {
    const med = findMedicine(it.medicineId)!;
    return {
      description: `${med.name} × ${it.quantity} ${med.unit}`,
      quantity: it.quantity,
      unitPrice: med.sellPrice,
      lineTotal: round2(med.sellPrice * it.quantity),
    };
  });
  const subtotal = round2(lineItems.reduce((s, i) => s + i.lineTotal, 0));
  const taxAmount = round2(subtotal * PHARMACY_GST_RATE);
  const totalAmount = round2(subtotal + taxAmount);

  // Deduct stock + log SALE movement per aggregated medicine. Deduction is
  // checked; on an unexpected failure, previously deducted lines are restored
  // so the bill is all-or-nothing.
  const deducted: Array<[string, number]> = [];
  for (const [medicineId, totalQty] of needed) {
    const res = applyStockChange(medicineId, -totalQty, "SALE", `Dispensed — ${number}`, session.user.fullName);
    if (!res.ok) {
      for (const [id, qty] of deducted) {
        applyStockChange(id, qty, "ADJUST", `Rollback — ${number} failed`, session.user.fullName);
      }
      return { ok: false, message: res.message };
    }
    deducted.push([medicineId, totalQty]);
  }

  const now = new Date().toISOString();
  const invoice: Invoice = {
    id: `inv_${Date.now()}`,
    number,
    branchId: payload.branchId,
    patientId: patient.id,
    patientName: patient.fullName,
    status: "PAID",
    paymentStatus: "PAID",
    items: lineItems,
    subtotal,
    discountAmount: 0,
    taxAmount,
    totalAmount,
    paidAmount: totalAmount,
    balanceAmount: 0,
    createdAt: now,
  };
  invoices.unshift(invoice);

  revalidatePath("/admin/billing");
  revalidatePath("/reception/billing");
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Bill ${number} generated (${lineItems.length} item(s)). Inventory updated.`, data: invoice };
}

/* ------------------------------------------------------------------------- */

function nextInvoiceNumber(): string {
  return `INV-2026-${String(230 + invoices.length + 1).padStart(6, "0")}`;
}

function revalidateBilling(id?: string) {
  revalidatePath("/admin/billing");
  revalidatePath("/reception/billing");
  revalidatePath("/portal/billing");
  if (id) {
    revalidatePath(`/admin/billing/${id}`);
    revalidatePath(`/reception/billing/${id}`);
    revalidatePath(`/portal/billing/${id}`);
  }
}

const consultationInvoiceSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  branchId: z.string().min(1, "Select a branch"),
  doctorId: z.string().min(1, "Select a doctor"),
  amount: z.coerce.number().positive("Enter a fee").max(1_000_000),
  description: z.string().max(200).optional(),
  discountAmount: z.coerce.number().min(0).max(1_000_000).default(0),
  gstRate: z.coerce.number().refine((v) => [0, 0.05, 0.12, 0.18].includes(v), "Invalid GST rate"),
  payment: z.enum(["PAID_FULL", "UNPAID"]),
});

/** Create a consultation invoice (fee prefilled from the doctor, overridable). */
export async function createConsultationInvoiceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Invoice>> {
  const authz = await authorize("billing", "create");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = consultationInvoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const patient = patients.find((p) => p.id === input.patientId);
  const doctor = doctors.find((d) => d.id === input.doctorId);
  const branch = branches.find((b) => b.id === input.branchId);
  if (!patient || !doctor || !branch) return { ok: false, message: "Invalid patient, doctor or branch." };

  const subtotal = round2(input.amount);
  const discountAmount = round2(Math.min(input.discountAmount, subtotal));
  const taxAmount = round2((subtotal - discountAmount) * input.gstRate);
  const totalAmount = round2(subtotal - discountAmount + taxAmount);
  const paid = input.payment === "PAID_FULL";

  const number = nextInvoiceNumber();
  const invoice: Invoice = {
    id: `inv_${Date.now()}`,
    number,
    branchId: branch.id,
    patientId: patient.id,
    patientName: patient.fullName,
    status: paid ? "PAID" : "ISSUED",
    paymentStatus: paid ? "PAID" : "UNPAID",
    items: [
      {
        description: input.description?.trim() || `Consultation — ${doctor.fullName}`,
        quantity: 1,
        unitPrice: subtotal,
        lineTotal: subtotal,
      },
    ],
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    paidAmount: paid ? totalAmount : 0,
    balanceAmount: paid ? 0 : totalAmount,
    createdAt: new Date().toISOString(),
  };
  invoices.unshift(invoice);

  logAudit({
    actor: user.fullName,
    role: user.role,
    action: "CREATE",
    entity: "Invoice",
    summary: `Invoice ${number} for ${patient.fullName} — ₹${totalAmount}${paid ? " (paid)" : ""}`,
  });
  revalidateBilling(invoice.id);
  return { ok: true, message: `Invoice ${number} created.`, data: invoice };
}

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount"),
  mode: z.enum(["CASH", "CARD", "UPI"]),
});

/** Record a (possibly partial) payment against an invoice. */
export async function recordPaymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Invoice>> {
  const authz = await authorize("billing", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { invoiceId, amount, mode } = parsed.data;

  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) return { ok: false, message: "Invoice not found." };
  if (invoice.status === "CANCELLED") return { ok: false, message: "Cannot collect on a cancelled invoice." };
  if (invoice.balanceAmount <= 0) return { ok: false, message: "This invoice is already fully paid." };
  if (amount > invoice.balanceAmount) {
    return {
      ok: false,
      message: `Amount exceeds the outstanding balance (₹${invoice.balanceAmount}).`,
      fieldErrors: { amount: [`Max ₹${invoice.balanceAmount}`] },
    };
  }

  invoice.paidAmount = round2(invoice.paidAmount + amount);
  invoice.balanceAmount = round2(invoice.totalAmount - invoice.paidAmount);
  const settled = invoice.balanceAmount <= 0;
  invoice.paymentStatus = settled ? "PAID" : "PARTIAL";
  invoice.status = settled ? "PAID" : "PARTIALLY_PAID";

  logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "Payment",
    summary: `Collected ₹${amount} (${mode}) for ${invoice.number}${settled ? " — settled" : ""}`,
  });
  revalidateBilling(invoice.id);
  return {
    ok: true,
    message: settled
      ? `${invoice.number} fully settled.`
      : `₹${amount} recorded — ₹${invoice.balanceAmount} outstanding.`,
    data: invoice,
  };
}
