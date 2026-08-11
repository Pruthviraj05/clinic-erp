import { formatCurrency, formatDate, humanizeEnum } from "@/lib/format";
import type { Appointment, Branch, Doctor, Invoice, Patient } from "@/types/domain";
import type { StockMovementItem } from "@/types/domain";

export interface ReportContext {
  invoices: Invoice[];
  appointments: Appointment[];
  patients: Patient[];
  stockMovements: StockMovementItem[];
  doctors: Doctor[];
  branches: Branch[];
}

export interface ReportFilters {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  branchId: string; // "" = all
  doctorId: string; // "" = all
}

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportColumn {
  key: string;
  header: string;
  /** Right-aligned plain number. */
  numeric?: boolean;
  /** Right-aligned, formatted as currency. */
  currency?: boolean;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  totalLabel?: string;
  totalValue?: number;
  totalIsCurrency?: boolean;
}

/** Inclusive day-range check against an ISO timestamp. */
function inRange(iso: string, from: string, to: string): boolean {
  const d = iso.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

export const REPORT_DEFS = [
  { key: "revenue", title: "Revenue report", desc: "Every invoice — filter by date and branch." },
  { key: "doctor", title: "Doctor performance", desc: "Consultations and revenue per doctor." },
  { key: "branch", title: "Branch revenue", desc: "Revenue split across branches." },
  { key: "patients", title: "Patient growth", desc: "New patient registrations over time." },
  { key: "medicine", title: "Medicine consumption", desc: "Stock dispensed, filtered by date." },
  { key: "noshow", title: "No-show & follow-ups", desc: "Missed visits and pending follow-up bookings." },
] as const;

export type ReportKey = (typeof REPORT_DEFS)[number]["key"];

export function buildReport(key: ReportKey, ctx: ReportContext, filters: ReportFilters): ReportResult {
  const { from, to, branchId, doctorId } = filters;
  const branchName = new Map(ctx.branches.map((b) => [b.id, b.name]));

  switch (key) {
    case "revenue": {
      const rows = ctx.invoices
        .filter((i) => inRange(i.createdAt, from, to))
        .filter((i) => !branchId || i.branchId === branchId)
        .map((i) => ({
          Date: formatDate(i.createdAt),
          Invoice: i.number,
          Patient: i.patientName,
          Branch: branchName.get(i.branchId) ?? "—",
          Status: humanizeEnum(i.paymentStatus),
          Total: i.totalAmount,
          Paid: i.paidAmount,
          Balance: i.balanceAmount,
        }));
      return {
        columns: [
          { key: "Date", header: "Date" },
          { key: "Invoice", header: "Invoice #" },
          { key: "Patient", header: "Patient" },
          { key: "Branch", header: "Branch" },
          { key: "Status", header: "Status" },
          { key: "Total", header: "Total", currency: true },
          { key: "Paid", header: "Paid", currency: true },
          { key: "Balance", header: "Balance", currency: true },
        ],
        rows,
        totalLabel: "Total collected",
        totalValue: rows.reduce((s, r) => s + (r.Paid as number), 0),
        totalIsCurrency: true,
      };
    }

    case "doctor": {
      const inRangeInvoices = ctx.invoices.filter((i) => inRange(i.createdAt, from, to));
      const inRangeAppts = ctx.appointments.filter((a) => inRange(a.scheduledStart, from, to));
      const doctorsInScope = ctx.doctors.filter((d) => !doctorId || d.id === doctorId);
      const rows = doctorsInScope.map((d) => {
        const theirBranches = new Set(d.branchIds);
        const sharing = (bId: string) => ctx.doctors.filter((x) => x.branchIds.includes(bId)).length || 1;
        const revenue = inRangeInvoices
          .filter((i) => theirBranches.has(i.branchId))
          .reduce((s, i) => s + i.paidAmount / sharing(i.branchId), 0);
        const consultations = inRangeAppts.filter((a) => a.doctorId === d.id && a.status === "COMPLETED").length;
        return {
          Doctor: d.fullName,
          Specialization: d.specialization ?? "—",
          Consultations: consultations,
          Revenue: Math.round(revenue * 100) / 100,
        };
      });
      return {
        columns: [
          { key: "Doctor", header: "Doctor" },
          { key: "Specialization", header: "Specialization" },
          { key: "Consultations", header: "Consultations", numeric: true },
          { key: "Revenue", header: "Revenue (est.)", currency: true },
        ],
        rows,
        totalLabel: "Total revenue (est.)",
        totalValue: rows.reduce((s, r) => s + (r.Revenue as number), 0),
        totalIsCurrency: true,
      };
    }

    case "branch": {
      const inRangeInvoices = ctx.invoices.filter((i) => inRange(i.createdAt, from, to));
      const branchesInScope = ctx.branches.filter((b) => !branchId || b.id === branchId);
      const rows = branchesInScope.map((b) => {
        const theirs = inRangeInvoices.filter((i) => i.branchId === b.id);
        return {
          Branch: b.name,
          Invoices: theirs.length,
          Revenue: theirs.reduce((s, i) => s + i.paidAmount, 0),
        };
      });
      return {
        columns: [
          { key: "Branch", header: "Branch" },
          { key: "Invoices", header: "Invoices", numeric: true },
          { key: "Revenue", header: "Revenue", currency: true },
        ],
        rows,
        totalLabel: "Total revenue",
        totalValue: rows.reduce((s, r) => s + (r.Revenue as number), 0),
        totalIsCurrency: true,
      };
    }

    case "patients": {
      const rows = ctx.patients
        .filter((p) => inRange(p.createdAt, from, to))
        .map((p) => ({
          Date: formatDate(p.createdAt),
          Patient: p.fullName,
          MRN: p.mrn,
          Phone: p.phone,
          City: p.city ?? "—",
          Status: p.lastVisitAt && p.lastVisitAt !== p.createdAt ? "Returning" : "New",
        }));
      return {
        columns: [
          { key: "Date", header: "Registered" },
          { key: "Patient", header: "Patient" },
          { key: "MRN", header: "MRN" },
          { key: "Phone", header: "Phone" },
          { key: "City", header: "City" },
          { key: "Status", header: "Status" },
        ],
        rows,
        totalLabel: "New registrations",
        totalValue: rows.length,
      };
    }

    case "medicine": {
      const rows = ctx.stockMovements
        .filter((m) => inRange(m.at, from, to))
        .filter((m) => m.type === "OUT" || m.type === "SALE")
        .map((m) => ({
          Date: formatDate(m.at),
          Medicine: m.medicineName,
          Type: humanizeEnum(m.type),
          Quantity: Math.abs(m.quantity),
          Reason: m.reason,
          By: m.by,
        }));
      return {
        columns: [
          { key: "Date", header: "Date" },
          { key: "Medicine", header: "Medicine" },
          { key: "Type", header: "Type" },
          { key: "Quantity", header: "Quantity", numeric: true },
          { key: "Reason", header: "Reason" },
          { key: "By", header: "By" },
        ],
        rows,
        totalLabel: "Units dispensed",
        totalValue: rows.reduce((s, r) => s + (r.Quantity as number), 0),
      };
    }

    case "noshow": {
      const rows = ctx.appointments
        .filter((a) => inRange(a.scheduledStart, from, to))
        .filter((a) => a.status === "NO_SHOW" || a.type === "FOLLOW_UP")
        .filter((a) => !doctorId || a.doctorId === doctorId)
        .map((a) => ({
          Date: formatDate(a.scheduledStart),
          Patient: a.patientName,
          Doctor: a.doctorName,
          Branch: a.branchName,
          Type: humanizeEnum(a.type),
          Status: humanizeEnum(a.status),
        }));
      return {
        columns: [
          { key: "Date", header: "Date" },
          { key: "Patient", header: "Patient" },
          { key: "Doctor", header: "Doctor" },
          { key: "Branch", header: "Branch" },
          { key: "Type", header: "Type" },
          { key: "Status", header: "Status" },
        ],
        rows,
        totalLabel: "Rows",
        totalValue: rows.length,
      };
    }
  }
}

export function formatReportValue(value: string | number, column: ReportColumn): string {
  if (column.currency) return formatCurrency(Number(value));
  return String(value);
}
