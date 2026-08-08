import Link from "next/link";
import { CalendarDays, FileText, Receipt, CalendarPlus, HeartPulse } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { appointments, prescriptions, invoices, patients, PORTAL_PATIENT_ID } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppointmentsPanel } from "@/features/dashboard/widgets";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function PortalDashboardPage() {
  await requireRole("PATIENT");

  const patient = patients.find((p) => p.id === PORTAL_PATIENT_ID)!;
  const myAppts = appointments
    .filter((a) => a.patientId === PORTAL_PATIENT_ID && new Date(a.scheduledStart) > new Date())
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const myRx = prescriptions.filter((p) => p.patientId === PORTAL_PATIENT_ID);
  const myBills = invoices.filter((i) => i.patientId === PORTAL_PATIENT_ID);
  const outstanding = myBills.reduce((s, i) => s + i.balanceAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${patient.firstName}`}
        description="Your upcoming visits, prescriptions and health records."
        actions={
          <Link href="/portal/appointments?new=1" className={cn(buttonVariants())}>
            <CalendarPlus className="size-4" /> Book appointment
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming visits" value={myAppts.length} icon={CalendarDays} accent="primary" />
        <StatCard label="Prescriptions" value={myRx.length} icon={FileText} accent="info" />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={Receipt} accent={outstanding > 0 ? "warning" : "success"} />
        <StatCard label="Blood group" value={patient.bloodGroup.replace("_", " ")} icon={HeartPulse} accent="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentsPanel title="Upcoming appointments" appointments={myAppts} href="/portal/appointments" showDate />
        </div>

        <SectionCard title="Recent prescriptions" noPadding>
          {myRx.length ? (
            <div className="divide-y">
              {myRx.map((rx) => (
                <Link key={rx.id} href="/portal/prescriptions" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{rx.diagnoses[0]}</p>
                    <p className="truncate text-xs text-muted-foreground">{rx.doctorName} · {formatDate(rx.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="No prescriptions yet" />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Billing history" noPadding>
        <div className="divide-y">
          {myBills.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{inv.number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</span>
                <StatusBadge status={inv.paymentStatus} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
