import { CalendarDays, IndianRupee, Users, Package, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getDashboardData } from "@/server/services/dashboard.service";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { AreaTrend, BarTrend, DonutChart } from "@/components/charts/lazy";
import { AppointmentsPanel, ActivityPanel, NotificationsPanel } from "@/features/dashboard/widgets";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

export default async function AdminDashboardPage() {
  const { user } = await requireRole("ADMIN");
  const [d, medicines] = await Promise.all([getDashboardData(user), db.medicines.list()]);
  const lowStock = medicines.filter((m) => m.stockQty <= m.reorderLevel);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${user.fullName.split(" ")[0]}`}
        description="Here's what's happening across all branches today."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's appointments" value={d.metrics.todayAppointments} icon={CalendarDays} trend={8.2} hint="vs yesterday" accent="primary" />
        <StatCard label="Today's collection" value={formatCurrency(d.metrics.todayCollection)} icon={IndianRupee} trend={12.5} hint="vs yesterday" accent="success" />
        <StatCard label="Patients today" value={d.metrics.todayPatients} icon={Users} trend={4.1} accent="info" />
        <StatCard label="Low stock items" value={d.metrics.lowStockCount} icon={Package} trend={-2} hint="need reorder" accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Revenue this week"
          description="Daily collections across branches"
          className="lg:col-span-2"
          action={<span className="text-sm font-medium text-[var(--success)]">{formatCurrencyCompact(d.metrics.monthRevenue)} this month</span>}
        >
          <AreaTrend data={d.revenueTrend} format="currency" />
        </SectionCard>
        <SectionCard title="Today by status" description="Appointment distribution">
          <DonutChart data={d.statusBreakdown} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Appointments this week" description="Volume per day" className="lg:col-span-2">
          <BarTrend data={d.appointmentTrend} />
        </SectionCard>
        <SectionCard
          title="Low stock alerts"
          action={<TrendingUp className="size-4 text-[var(--warning)]" />}
          noPadding
        >
          <div className="divide-y">
            {lowStock.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--warning)]">{m.stockQty} {m.unit}</p>
                  <p className="text-[11px] text-muted-foreground">reorder at {m.reorderLevel}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AppointmentsPanel title="Today's schedule" appointments={d.todayAppointments} href="/admin/appointments" />
        <NotificationsPanel items={d.notifications} />
        <ActivityPanel items={d.activities} />
      </div>
    </div>
  );
}
