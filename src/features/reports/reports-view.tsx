"use client";

import {
  FileBarChart,
  Users,
  Stethoscope,
  Building2,
  Pill,
  CalendarX,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

interface TrendPoint {
  label: string;
  value: number;
}

const REPORTS: { key: string; title: string; desc: string; icon: LucideIcon }[] = [
  { key: "revenue", title: "Revenue report", desc: "Daily / monthly / yearly collections", icon: TrendingUp },
  { key: "doctor", title: "Doctor performance", desc: "Consultations & revenue per doctor", icon: Stethoscope },
  { key: "branch", title: "Branch revenue", desc: "Revenue split across branches", icon: Building2 },
  { key: "patients", title: "Patient growth", desc: "New & returning patients", icon: Users },
  { key: "medicine", title: "Medicine consumption", desc: "Stock movement & usage", icon: Pill },
  { key: "noshow", title: "No-show & follow-ups", desc: "Missed and pending visits", icon: CalendarX },
];

function ExportRow({ name }: { name: string }) {
  return (
    <div className="flex gap-1.5">
      <Button variant="outline" size="sm" onClick={() => toast.success(`${name} exported as PDF (demo)`)}>
        <FileText className="size-3.5" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.success(`${name} exported as Excel (demo)`)}>
        <FileSpreadsheet className="size-3.5" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.success(`${name} exported as CSV (demo)`)}>
        <Download className="size-3.5" /> CSV
      </Button>
    </div>
  );
}

export function ReportsView({
  branchRevenue,
  doctorRevenue,
}: {
  branchRevenue: TrendPoint[];
  doctorRevenue: TrendPoint[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.key} className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="font-medium">{r.title}</p>
              <p className="mb-4 text-sm text-muted-foreground">{r.desc}</p>
              <ExportRow name={r.title} />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Revenue by branch"
          action={<FileBarChart className="size-4 text-muted-foreground" />}
          noPadding
        >
          <SummaryTable rows={branchRevenue} />
        </SectionCard>
        <SectionCard
          title="Revenue by doctor"
          action={<FileBarChart className="size-4 text-muted-foreground" />}
          noPadding
        >
          <SummaryTable rows={doctorRevenue} />
        </SectionCard>
      </div>
    </div>
  );
}

function SummaryTable({ rows }: { rows: TrendPoint[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm">{r.label}</span>
          <span className="font-medium">{formatCurrency(r.value)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold">Total</span>
        <span className="font-semibold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
