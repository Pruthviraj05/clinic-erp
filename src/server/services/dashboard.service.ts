import "server-only";
import {
  activities,
  appointments,
  getAppointmentTrend,
  getDashboardMetrics,
  getPatientGrowthTrend,
  getRevenueTrend,
  getStatusBreakdown,
  notifications,
  prescriptions,
} from "@/server/demo/data";
import type { SessionUser } from "@/lib/session";
import type { Appointment } from "@/types/domain";

/**
 * Dashboard read model. Aggregates the numbers + lists each role's landing
 * page needs, scoped to what that user is allowed to see.
 */
export interface DashboardData {
  metrics: ReturnType<typeof getDashboardMetrics>;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  notifications: typeof notifications;
  activities: typeof activities;
  revenueTrend: ReturnType<typeof getRevenueTrend>;
  appointmentTrend: ReturnType<typeof getAppointmentTrend>;
  patientGrowthTrend: ReturnType<typeof getPatientGrowthTrend>;
  statusBreakdown: ReturnType<typeof getStatusBreakdown>;
  pendingFollowUps: typeof prescriptions;
}

function scopeFor(user: SessionUser) {
  if (user.role === "DOCTOR") {
    // Doctor sees only their own appointments (matched by demo doctor id).
    return { doctorId: "doc_mehta", branchId: user.branchId };
  }
  if (user.role === "RECEPTIONIST") {
    return { branchId: user.branchId };
  }
  return {};
}

export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  const scope = scopeFor(user);
  const now = new Date();

  const inScope = (a: Appointment) =>
    (!scope.doctorId || a.doctorId === scope.doctorId) &&
    (!scope.branchId || a.branchId === scope.branchId);

  const isToday = (iso: string) => {
    const d = new Date(iso);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  return {
    metrics: getDashboardMetrics(scope),
    todayAppointments: appointments
      .filter(inScope)
      .filter((a) => isToday(a.scheduledStart))
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
    upcomingAppointments: appointments
      .filter(inScope)
      .filter((a) => new Date(a.scheduledStart) > now)
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
      .slice(0, 6),
    notifications: notifications.slice(0, 6),
    activities: activities.slice(0, 6),
    revenueTrend: getRevenueTrend(),
    appointmentTrend: getAppointmentTrend(),
    patientGrowthTrend: getPatientGrowthTrend(),
    statusBreakdown: getStatusBreakdown(),
    pendingFollowUps: prescriptions.filter(
      (p) => p.followUpDate && new Date(p.followUpDate) > now,
    ),
  };
}
