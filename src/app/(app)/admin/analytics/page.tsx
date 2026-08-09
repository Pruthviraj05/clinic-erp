import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getDashboardData } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { AreaTrend, BarTrend, DonutChart } from "@/components/charts/lazy";
import type { TrendPoint } from "@/types/domain";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const session = await requireRole("ADMIN");
  const [data, stockMovements] = await Promise.all([
    getDashboardData(session.user),
    db.stockMovements.list(),
  ]);

  const consumption = new Map<string, number>();
  for (const m of stockMovements) {
    if (m.type !== "SALE" && m.type !== "OUT") continue;
    consumption.set(m.medicineName, (consumption.get(m.medicineName) ?? 0) + Math.abs(m.quantity));
  }
  const medicineConsumption: TrendPoint[] = Array.from(consumption.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Performance across revenue, patients and operations." />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Revenue trend" description="Daily collections (last 7 days)" className="lg:col-span-2">
          <AreaTrend data={data.revenueTrend} format="currency" />
        </SectionCard>
        <SectionCard title="Today's appointment status" description="Live split">
          <DonutChart data={data.statusBreakdown} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Patient growth" description="New patients per month">
          <AreaTrend data={data.patientGrowthTrend} color="var(--chart-3)" />
        </SectionCard>
        <SectionCard title="Appointments" description="Volume per day (last 7 days)">
          <BarTrend data={data.appointmentTrend} />
        </SectionCard>
      </div>

      <SectionCard title="Top medicine consumption" description="Units dispensed">
        {medicineConsumption.length > 0 ? (
          <BarTrend data={medicineConsumption} color="var(--chart-4)" />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No dispensing activity yet.</p>
        )}
      </SectionCard>
    </div>
  );
}
