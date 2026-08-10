import "server-only";
import { db } from "@/server/repositories";
import { humanizeEnum } from "@/lib/format";
import { visibleNotifications } from "@/lib/notifications";
import type { SessionUser } from "@/lib/session";
import type { Appointment, ActivityItem, DashboardMetrics, NotificationItem, Prescription, TrendPoint } from "@/types/domain";

/**
 * Dashboard read model. Aggregates the numbers + lists each role's landing
 * page needs, scoped to what that user is allowed to see, computed live from
 * real data (no hardcoded demo numbers) — a brand-new clinic correctly shows
 * near-empty charts until real activity accumulates.
 */
export interface DashboardData {
  metrics: DashboardMetrics;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  notifications: NotificationItem[];
  activities: ActivityItem[];
  revenueTrend: TrendPoint[];
  appointmentTrend: TrendPoint[];
  patientGrowthTrend: TrendPoint[];
  statusBreakdown: TrendPoint[];
  pendingFollowUps: Prescription[];
}

function scopeFor(user: SessionUser) {
  if (user.role === "DOCTOR") {
    return { doctorId: user.linkId, branchId: user.branchId };
  }
  if (user.role === "RECEPTIONIST") {
    return { branchId: user.branchId };
  }
  return {};
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function last7DayBuckets(): { label: string; date: Date }[] {
  const days: { label: string; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ label: WEEKDAY_LABELS[d.getDay()], date: d });
  }
  return days;
}

function isSameDay(iso: string, date: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const scope = scopeFor(user);
  const now = new Date();

  const [allAppointments, allInvoices, allMedicines, allPrescriptions, allNotifications, allAuditLog] =
    await Promise.all([
      db.appointments.list(),
      db.invoices.list(),
      db.medicines.list(),
      db.prescriptions.list(),
      db.notifications.list(),
      db.auditLog.list(),
    ]);

  const inScope = (a: Appointment) =>
    (!scope.doctorId || a.doctorId === scope.doctorId) &&
    (!scope.branchId || a.branchId === scope.branchId);

  const isToday = (iso: string) => isSameDay(iso, now);

  const scopedAppointments = allAppointments.filter(inScope);
  const scopedInvoices = scope.branchId ? allInvoices.filter((i) => i.branchId === scope.branchId) : allInvoices;
  const todayAppts = scopedAppointments.filter((a) => isToday(a.scheduledStart));
  const todayInvoices = scopedInvoices.filter((i) => isToday(i.createdAt));

  const metrics: DashboardMetrics = {
    todayAppointments: todayAppts.length,
    upcomingAppointments: scopedAppointments.filter(
      (a) => new Date(a.scheduledStart) > now && ["SCHEDULED", "CONFIRMED"].includes(a.status),
    ).length,
    pendingFollowUps: allPrescriptions.filter(
      (p) => p.followUpDate && new Date(p.followUpDate) > now && (!scope.doctorId || p.doctorId === scope.doctorId),
    ).length,
    todayCollection: todayInvoices.reduce((sum, i) => sum + i.paidAmount, 0),
    todayPatients: new Set(todayAppts.map((a) => a.patientId)).size,
    monthRevenue: scopedInvoices
      .filter((i) => {
        const d = new Date(i.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, i) => sum + i.paidAmount, 0),
    lowStockCount: allMedicines.filter((m) => m.isActive && m.stockQty <= m.reorderLevel).length,
    noShowCount: todayAppts.filter((a) => a.status === "NO_SHOW").length,
  };

  const days = last7DayBuckets();
  const revenueTrend: TrendPoint[] = days.map(({ label, date }) => ({
    label,
    value: scopedInvoices.filter((i) => isSameDay(i.createdAt, date)).reduce((s, i) => s + i.paidAmount, 0),
  }));
  const appointmentTrend: TrendPoint[] = days.map(({ label, date }) => ({
    label,
    value: scopedAppointments.filter((a) => isSameDay(a.scheduledStart, date)).length,
  }));

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const allPatients = await db.patients.list();
  const monthBuckets: { label: string; year: number; month: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({ label: monthLabels[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
  }
  const patientGrowthTrend: TrendPoint[] = monthBuckets.map(({ label, year, month }) => ({
    label,
    value: allPatients.filter((p) => {
      const d = new Date(p.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length,
  }));

  const statusMap = new Map<string, number>();
  for (const a of todayAppts) statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1);
  const statusBreakdown: TrendPoint[] = Array.from(statusMap.entries()).map(([label, value]) => ({ label, value }));

  // Most recent six. `slice(0, 6)` on an append-ordered log returned the six
  // OLDEST rows, so the panel froze after the first six events ever recorded.
  const activities: ActivityItem[] = [...allAuditLog]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      actor: row.actor,
      action: humanizeEnum(row.action).toLowerCase(),
      target: row.summary,
      at: row.at,
    }));

  return {
    metrics,
    todayAppointments: todayAppts.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
    upcomingAppointments: scopedAppointments
      .filter((a) => new Date(a.scheduledStart) > now)
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
      .slice(0, 6),
    notifications: visibleNotifications(allNotifications, user.linkId).slice(0, 6),
    activities,
    revenueTrend,
    appointmentTrend,
    patientGrowthTrend,
    statusBreakdown,
    pendingFollowUps: allPrescriptions.filter(
      (p) => p.followUpDate && new Date(p.followUpDate) > now && (!scope.doctorId || p.doctorId === scope.doctorId),
    ),
  };
}
