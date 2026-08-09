import "server-only";
import { db } from "@/server/repositories";
import type { Appointment } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

/**
 * Appointment read model + filtering, backed by MongoDB (or the demo store
 * in demo mode) via the storage port. All queries are scoped to what the
 * caller may see (a doctor sees only their own linked record; a receptionist
 * their branch).
 */

export interface AppointmentFilters {
  status?: string;
  doctorId?: string;
  branchId?: string;
  /** "today" | "upcoming" | "all" */
  range?: "today" | "upcoming" | "all";
}

function scopeFor(user: SessionUser): AppointmentFilters {
  if (user.role === "DOCTOR") return { doctorId: user.linkId, branchId: undefined };
  if (user.role === "RECEPTIONIST") return { branchId: user.branchId };
  return {};
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export async function listAppointments(
  user: SessionUser,
  filters: AppointmentFilters = {},
): Promise<Appointment[]> {
  const scope = scopeFor(user);
  const doctorId = scope.doctorId ?? filters.doctorId;
  const branchId = scope.branchId ?? filters.branchId;

  let rows = await db.appointments.list();
  if (doctorId) rows = rows.filter((a) => a.doctorId === doctorId);
  if (branchId) rows = rows.filter((a) => a.branchId === branchId);
  if (filters.status) rows = rows.filter((a) => a.status === filters.status);

  if (filters.range === "today") rows = rows.filter((a) => isToday(a.scheduledStart));
  else if (filters.range === "upcoming") rows = rows.filter((a) => new Date(a.scheduledStart) > new Date());

  return rows.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
}

export async function getAppointment(
  user: SessionUser,
  id: string,
): Promise<Appointment | null> {
  const appt = await db.appointments.get(id);
  if (!appt) return null;
  // Apply the caller's scope to the single row (no full-list filter+sort).
  const scope = scopeFor(user);
  if (scope.doctorId && appt.doctorId !== scope.doctorId) return null;
  if (scope.branchId && appt.branchId !== scope.branchId) return null;
  return appt;
}

/** Simple counters for the filter tabs — one pass over the scoped rows. */
export async function getAppointmentCounts(user: SessionUser) {
  const all = await listAppointments(user, { range: "all" });
  const now = new Date();
  let today = 0;
  let upcoming = 0;
  for (const a of all) {
    if (isToday(a.scheduledStart)) today++;
    if (new Date(a.scheduledStart) > now) upcoming++;
  }
  return { all: all.length, today, upcoming };
}
