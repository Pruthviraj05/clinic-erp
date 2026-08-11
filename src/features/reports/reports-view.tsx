"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Users,
  Stethoscope,
  Building2,
  Pill,
  CalendarX,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
} from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { exportToExcel, exportToCsv } from "@/lib/export";
import {
  REPORT_DEFS,
  buildReport,
  formatReportValue,
  type ReportContext,
  type ReportKey,
} from "./report-defs";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<ReportKey, LucideIcon> = {
  revenue: TrendingUp,
  doctor: Stethoscope,
  branch: Building2,
  patients: Users,
  medicine: Pill,
  noshow: CalendarX,
};

const fieldClass =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ReportsView({
  context,
  branchOptions,
  doctorOptions,
}: {
  context: ReportContext;
  branchOptions: { id: string; label: string }[];
  doctorOptions: { id: string; label: string }[];
}) {
  const [openKey, setOpenKey] = useState<ReportKey | null>(null);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [branchId, setBranchId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const result = useMemo(
    () => (openKey ? buildReport(openKey, context, { from, to, branchId, doctorId }) : null),
    [openKey, context, from, to, branchId, doctorId],
  );

  if (openKey && result) {
    const def = REPORT_DEFS.find((r) => r.key === openKey)!;
    const showBranchFilter = openKey === "revenue" || openKey === "branch";
    const showDoctorFilter = openKey === "doctor" || openKey === "noshow";

    const exportRows = () =>
      result.rows.map((r) => {
        const flat: Record<string, unknown> = {};
        for (const c of result.columns) flat[c.header] = r[c.key];
        return flat;
      });

    return (
      <div className="space-y-4">
        <div className="print-hide flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => setOpenKey(null)}>
            <ArrowLeft className="size-4" /> Back to reports
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileText className="size-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportToExcel(exportRows(), def.title, def.title)}>
              <FileSpreadsheet className="size-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCsv(exportRows(), def.title)}>
              <Download className="size-3.5" /> CSV
            </Button>
          </div>
        </div>

        <div className="print-hide flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
          </div>
          {showBranchFilter && (
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={fieldClass}>
                <option value="">All branches</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>
          )}
          {showDoctorFilter && (
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Doctor</label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={fieldClass}>
                <option value="">All doctors</option>
                {doctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
          <p className="ml-auto text-xs text-muted-foreground">{result.rows.length} row(s)</p>
        </div>

        <div className="print-area">
          <div className="mb-3 hidden print:block">
            <h1 className="text-lg font-bold">{def.title}</h1>
            <p className="text-sm text-muted-foreground">{from} to {to}</p>
          </div>
          <SectionCard title={def.title} description={def.desc} noPadding>
            {result.rows.length === 0 ? (
              <EmptyState icon={ICONS[openKey]} title="No data in this range" description="Try widening the date range or filters." />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      {result.columns.map((c) => (
                        <th key={c.key} className={`px-4 py-2.5 font-medium ${c.numeric || c.currency ? "text-right" : ""}`}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {result.columns.map((c) => (
                          <td key={c.key} className={`px-4 py-2.5 ${c.numeric || c.currency ? "text-right font-medium" : ""}`}>
                            {formatReportValue(row[c.key], c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {result.totalValue !== undefined && (
                    <tfoot>
                      <tr className="bg-muted/40 font-semibold">
                        <td className="px-4 py-2.5" colSpan={result.columns.length - 1}>{result.totalLabel}</td>
                        <td className="px-4 py-2.5 text-right">
                          {result.totalIsCurrency ? formatCurrency(result.totalValue) : result.totalValue}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {REPORT_DEFS.map((r) => {
        const Icon = ICONS[r.key];
        return (
          <button
            key={r.key}
            onClick={() => setOpenKey(r.key)}
            className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <p className="font-medium">{r.title}</p>
            <p className="mb-4 text-sm text-muted-foreground">{r.desc}</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Printer className="size-3.5" /> Open report
            </span>
          </button>
        );
      })}
    </div>
  );
}
