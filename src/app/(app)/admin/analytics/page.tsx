import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import {
  getRevenueTrend,
  getAppointmentTrend,
  getPatientGrowthTrend,
} from "@/server/demo/data";
import {
  branchRevenue,
  doctorRevenue,
  medicineConsumption,
  paymentModeSplit,
} from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { AreaTrend, BarTrend, DonutChart } from "@/components/charts/lazy";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Performance across revenue, patients and operations." />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Revenue trend" description="Daily collections" className="lg:col-span-2">
          <AreaTrend data={getRevenueTrend()} format="currency" />
        </SectionCard>
        <SectionCard title="Payment modes" description="Transaction split">
          <DonutChart data={paymentModeSplit} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Patient growth" description="New patients per month">
          <AreaTrend data={getPatientGrowthTrend()} color="var(--chart-3)" />
        </SectionCard>
        <SectionCard title="Appointments" description="Volume per day">
          <BarTrend data={getAppointmentTrend()} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue by branch">
          <BarTrend data={branchRevenue} color="var(--chart-2)" format="currency" />
        </SectionCard>
        <SectionCard title="Revenue by doctor">
          <BarTrend data={doctorRevenue} color="var(--chart-5)" format="currency" />
        </SectionCard>
      </div>

      <SectionCard title="Top medicine consumption" description="Units dispensed">
        <BarTrend data={medicineConsumption} color="var(--chart-4)" />
      </SectionCard>
    </div>
  );
}
