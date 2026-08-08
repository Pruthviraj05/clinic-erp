"use client";

import { Plus, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InsurancePlanItem, PatientInsuranceItem } from "@/server/demo/extra";

export function InsuranceView({
  plans,
  policies,
}: {
  plans: InsurancePlanItem[];
  policies: PatientInsuranceItem[];
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Insurance plans & TPAs"
        action={
          <Button size="sm" onClick={() => toast.success("Add plan (demo)")}>
            <Plus className="size-4" /> Add plan
          </Button>
        }
        noPadding
      >
        <div className="divide-y">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldPlus className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{p.provider} — {p.planName}</p>
                  <p className="text-xs text-muted-foreground">TPA: {p.tpa}</p>
                </div>
              </div>
              <StatusBadge status={p.active ? "ACTIVE" : "INACTIVE"} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Patient policies" noPadding>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Policy no.</th>
                <th className="px-4 py-3 font-medium">Coverage</th>
                <th className="px-4 py-3 font-medium">Valid till</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.patientName}</td>
                  <td className="px-4 py-3">{p.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.policyNumber}</td>
                  <td className="px-4 py-3">{formatCurrency(p.coverage)}</td>
                  <td className="px-4 py-3">{formatDate(p.validTo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
