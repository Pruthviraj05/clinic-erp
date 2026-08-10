import "server-only";
import { db } from "@/server/repositories";
import type { Query } from "@/server/repositories/storage-port";
import type { Invoice } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

/** Fail-closed, same reasoning as prescriptions: no link → no rows. */
export async function listInvoices(user: SessionUser, patientId?: string): Promise<Invoice[]> {
  const query: Query = {};

  if (user.role === "RECEPTIONIST" && user.branchId) query.branchId = user.branchId;
  if (user.role === "PATIENT") {
    if (!user.linkId) return [];
    query.patientId = user.linkId;
  }

  if (patientId) {
    if (query.patientId && query.patientId !== patientId) return [];
    query.patientId = patientId;
  }

  return db.invoices.find(query, { sort: { createdAt: -1 } });
}

/** Scoped single-invoice read: receptionists see their branch, patients only their own. */
export async function getInvoice(user: SessionUser, id: string): Promise<Invoice | null> {
  const invoice = await db.invoices.get(id);
  if (!invoice) return null;
  if (user.role === "RECEPTIONIST" && user.branchId && invoice.branchId !== user.branchId) return null;
  if (user.role === "PATIENT" && invoice.patientId !== user.linkId) return null;
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
