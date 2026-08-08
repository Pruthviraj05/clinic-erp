import "server-only";
import { invoices, PORTAL_PATIENT_ID } from "@/server/demo/data";
import type { Invoice } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

function branchScope(user: SessionUser): string | undefined {
  return user.role === "RECEPTIONIST" ? user.branchId : undefined;
}

export async function listInvoices(user: SessionUser, patientId?: string): Promise<Invoice[]> {
  const branchId = branchScope(user);
  let rows = invoices.slice();
  if (branchId) rows = rows.filter((i) => i.branchId === branchId);
  if (patientId) rows = rows.filter((i) => i.patientId === patientId);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Scoped single-invoice read: receptionists see their branch, patients only their own. */
export async function getInvoice(user: SessionUser, id: string): Promise<Invoice | null> {
  const invoice = invoices.find((i) => i.id === id) ?? null;
  if (!invoice) return null;
  if (user.role === "RECEPTIONIST" && user.branchId && invoice.branchId !== user.branchId) return null;
  if (user.role === "PATIENT" && invoice.patientId !== PORTAL_PATIENT_ID) return null;
  return invoice;
}

export interface BillingSummary {
  todayCollection: number;
  outstanding: number;
  invoiceCount: number;
  paidCount: number;
}

export async function getBillingSummary(user: SessionUser): Promise<BillingSummary> {
  const rows = await listInvoices(user);
  const isToday = (iso: string) => {
    const d = new Date(iso);
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };
  return {
    todayCollection: rows.filter((i) => isToday(i.createdAt)).reduce((s, i) => s + i.paidAmount, 0),
    outstanding: rows.reduce((s, i) => s + i.balanceAmount, 0),
    invoiceCount: rows.length,
    paidCount: rows.filter((i) => i.paymentStatus === "PAID").length,
  };
}
