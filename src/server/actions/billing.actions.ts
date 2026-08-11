"use server";

import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import { z } from "zod";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getCachedBranch, getCachedDoctor } from "@/server/cache/reference-data";
import { logAudit } from "@/server/demo/extra";
import { PHARMACY_GST_RATE, round2 } from "@/lib/billing-rates";
import { commitDispense, planDispense, restoreDispense, type DispenseLine } from "@/server/demo/batch-store";
import { BILL_ACCENTS, type BillDesign, type BillKind } from "@/server/demo/bill-design-store";
import type { Invoice, InvoiceItem } from "@/types/domain";
import type { ActionResult } from "./appointment.actions";


/**
 * Invoice numbers come from an atomic counter, never from a row count.
 *
 * Counting was both O(collection) and racy: two receptionists billing at the
 * same moment both read the same count and minted the SAME invoice number,
 * and deleting an invoice made the next number reuse an existing one.
 */
async function nextInvoiceNumber(): Promise<string> {
  const seq = await db.counters.next("invoice");
  return `INV-2026-${String(230 + seq).padStart(6, "0")}`;
}

function revalidateBilling(id?: string) {
  revalidatePath("/admin/billing");
  revalidatePath("/reception/billing");
  revalidatePath("/portal/billing");
  revalidatePath("/admin/inventory");
  if (id) {
    revalidatePath(`/admin/billing/${id}`);
    revalidatePath(`/reception/billing/${id}`);
    revalidatePath(`/portal/billing/${id}`);
  }
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

  const patient = await db.patients.get(payload.patientId);
  if (!patient) return { ok: false, message: "Please select a patient." };
  const branch = await getCachedBranch(payload.branchId);
  if (!branch) return { ok: false, message: "Invalid branch." };

  const items = (payload.items ?? []).filter((i) => i.medicineId && i.quantity > 0);
  if (!items.length) return { ok: false, message: "Add at least one medicine." };

  // Aggregate per medicine first — the same medicine may appear on several
  // lines, and stock must cover the TOTAL, not each line independently.
  const needed = new Map<string, number>();
  for (const it of items) {
    needed.set(it.medicineId, (needed.get(it.medicineId) ?? 0) + it.quantity);
  }
  const medicineCache = new Map<string, Awaited<ReturnType<typeof db.medicines.get>>>();
  // Plan every withdrawal BEFORE writing anything: a bill that dispensed half
  // its lines and then failed would leave stock and the ledger disagreeing.
  const plans = new Map<string, DispenseLine[]>();
  for (const [medicineId, totalQty] of needed) {
    const med = await db.medicines.get(medicineId);
    medicineCache.set(medicineId, med);
    if (!med) return { ok: false, message: "Invalid medicine selected." };

    const plan = await planDispense(medicineId, totalQty);
    if (!plan.ok) {
      return {
        ok: false,
        message: `Insufficient stock for ${med.name} (only ${plan.available} ${med.unit}, bill needs ${totalQty}).`,
      };
    }
    plans.set(medicineId, plan.lines);
  }

  const number = await nextInvoiceNumber();
  const lineItems: InvoiceItem[] = items.map((it) => {
    const med = medicineCache.get(it.medicineId)!;
    return {
      description: `${med.name} × ${it.quantity} ${med.unit}`,
      quantity: it.quantity,
      unitPrice: med.sellPrice,
      lineTotal: round2(med.sellPrice * it.quantity),
    };
  });
  const subtotal = round2(lineItems.reduce((s, i) => s + i.lineTotal, 0));
  // GST is per item — pharma spans 5/12/18%, so a single flat rate mis-bills
  // and under-reports tax. Falls back to the default slab when unset.
  const taxAmount = round2(
    items.reduce((sum, it) => {
      const med = medicineCache.get(it.medicineId)!;
      const rate = med.gstRate ?? PHARMACY_GST_RATE;
      return sum + med.sellPrice * it.quantity * rate;
    }, 0),
  );
  const totalAmount = round2(subtotal + taxAmount);

  // Commit the planned FEFO withdrawals. Each medicine's plan was validated
  // above, so a failure here is unexpected — roll the earlier ones back so the
  // bill stays all-or-nothing.
  const committed: Array<[string, DispenseLine[]]> = [];
  try {
    for (const [medicineId, lines] of plans) {
      const med = medicineCache.get(medicineId)!;
      await commitDispense(medicineId, med.name, lines, `Dispensed — ${number}`, session.user.fullName);
      committed.push([medicineId, lines]);
    }
  } catch {
    for (const [medicineId, lines] of committed) {
      await restoreDispense(medicineId, lines, session.user.fullName);
    }
    return { ok: false, message: "Could not update stock — the bill was not created." };
  }

  const now = new Date().toISOString();
  const invoice: Invoice = {
    id: newId("inv"),
    number,
    branchId: payload.branchId,
    patientId: patient.id,
    patientName: patient.fullName,
    invoiceKind: "PHARMACY",
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
  await db.invoices.insert(invoice);

  await logAudit({
    actor: session.user.fullName,
    role: session.user.role,
    action: "CREATE",
    entity: "Invoice",
    summary: `Pharmacy bill ${number} for ${patient.fullName} — ₹${totalAmount}`,
  });

  revalidateBilling(invoice.id);
  return { ok: true, message: `Bill ${number} generated (${lineItems.length} item(s)). Inventory updated.`, data: invoice };
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

  const [patient, doctor, branch] = await Promise.all([
    db.patients.get(input.patientId),
    getCachedDoctor(input.doctorId),
    getCachedBranch(input.branchId),
  ]);
  if (!patient || !doctor || !branch) return { ok: false, message: "Invalid patient, doctor or branch." };

  const subtotal = round2(input.amount);
  const discountAmount = round2(Math.min(input.discountAmount, subtotal));
  const taxAmount = round2((subtotal - discountAmount) * input.gstRate);
  const totalAmount = round2(subtotal - discountAmount + taxAmount);
  const paid = input.payment === "PAID_FULL";

  const number = await nextInvoiceNumber();
  const invoice: Invoice = {
    id: newId("inv"),
    number,
    branchId: branch.id,
    patientId: patient.id,
    patientName: patient.fullName,
    invoiceKind: "CONSULTATION",
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
  await db.invoices.insert(invoice);

  await logAudit({
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

  const invoice = await db.invoices.get(invoiceId);
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

  const paidAmount = round2(invoice.paidAmount + amount);
  const balanceAmount = round2(invoice.totalAmount - paidAmount);
  const settled = balanceAmount <= 0;
  const updated = await db.invoices.update(invoiceId, {
    paidAmount,
    balanceAmount,
    paymentStatus: settled ? "PAID" : "PARTIAL",
    status: settled ? "PAID" : "PARTIALLY_PAID",
  });
  if (!updated) return { ok: false, message: "Invoice not found." };

  await logAudit({
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
      : `₹${amount} recorded — ₹${updated.balanceAmount} outstanding.`,
    data: updated,
  };
}

const billDesignSchema = z.object({
  kind: z.enum(["PHARMACY", "CONSULTATION"]),
  documentTitle: z.string().trim().min(2).max(60),
  headerNote: z.string().max(200),
  footerNote: z.string().max(500),
  accentColor: z.string().refine((c) => BILL_ACCENTS.includes(c), "Pick one of the offered colours"),
});

/**
 * Save the letterhead for pharmacy bills or payment invoices — a clinic-wide
 * setting, not per-doctor, so only admins manage it (front desk prints these,
 * but doesn't redesign them).
 */
export async function saveBillDesignAction(
  payload: z.infer<typeof billDesignSchema>,
): Promise<ActionResult<BillDesign>> {
  const authz = await authorize("settings", "edit");
  if (!authz.ok) return authz;
  const { user } = authz.session;

  const parsed = billDesignSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Design could not be validated." };

  const { kind, ...rest } = parsed.data;
  const existing = await db.billDesigns.get(kind);
  const design: BillDesign & { id: string } = { id: kind, kind: kind as BillKind, ...rest };
  if (existing) await db.billDesigns.update(kind, design);
  else await db.billDesigns.insert(design);

  await logAudit({
    actor: user.fullName,
    role: user.role,
    action: "UPDATE",
    entity: "BillDesign",
    summary: `Updated the ${kind === "PHARMACY" ? "pharmacy bill" : "payment invoice"} letterhead`,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/billing");
  revalidatePath("/reception/billing");
  return { ok: true, message: "Bill design saved.", data: design };
}
