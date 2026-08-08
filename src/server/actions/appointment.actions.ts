"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { appointments, branches, doctors, patients, PORTAL_PATIENT_ID } from "@/server/demo/data";
import { db } from "@/server/repositories";
import { logAudit } from "@/server/demo/extra";
import { createAppointmentSchema, rescheduleSchema, updateStatusSchema } from "@/features/appointments/schema";
import type { Appointment, AppointmentStatus } from "@/types/domain";

export interface ActionResult<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Create an appointment.
 * DEMO MODE: mutates the in-memory dataset so the new row appears immediately.
 * PRISMA MODE: this becomes a repository.create inside a transaction that also
 * assigns the token number and emits notifications.
 */
export async function createAppointmentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Appointment>> {
  const authz = await authorize("appointments", "create");
  if (!authz.ok) return authz;

  const parsed = createAppointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  // Patients may only book for themselves, whatever the posted patientId says.
  if (authz.session.user.role === "PATIENT") {
    input.patientId = PORTAL_PATIENT_ID;
  }

  const patient = patients.find((p) => p.id === input.patientId);
  const doctor = doctors.find((d) => d.id === input.doctorId);
  const branch = branches.find((b) => b.id === input.branchId);
  if (!patient || !doctor || !branch) {
    return { ok: false, message: "Invalid patient, doctor or branch." };
  }

  const start = new Date(`${input.date}T${input.time}`);
  // Regexes pass out-of-range values like 2026-13-45 — reject Invalid Date
  // before toISOString() can throw.
  if (Number.isNaN(start.getTime())) {
    return { ok: false, message: "Invalid date or time.", fieldErrors: { date: ["Invalid date or time."] } };
  }
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  // Prevent an exact duplicate slot for the same doctor.
  const clash = appointments.find(
    (a) => a.doctorId === doctor.id && a.scheduledStart === start.toISOString() && a.status !== "CANCELLED",
  );
  if (clash) {
    return { ok: false, message: "That slot is already booked for this doctor." };
  }

  const todayForBranch = appointments.filter(
    (a) => a.branchId === branch.id && new Date(a.scheduledStart).toDateString() === start.toDateString(),
  );

  const appt: Appointment = {
    id: `apt_${Date.now()}`,
    branchId: branch.id,
    branchName: branch.name,
    patientId: patient.id,
    patientName: patient.fullName,
    patientMrn: patient.mrn,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    type: input.type,
    status: input.type === "WALK_IN" ? "CHECKED_IN" : "SCHEDULED",
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    tokenNumber: todayForBranch.length + 1,
    reason: input.reason ?? null,
    paymentStatus: "UNPAID",
  };
  appointments.push(appt);

  revalidatePath("/admin/appointments");
  revalidatePath("/reception/appointments");
  revalidatePath("/doctor/appointments");
  revalidatePath("/portal/appointments");
  return { ok: true, message: "Appointment booked.", data: appt };
}

/** Advance/adjust an appointment's status, stamping the relevant timestamp. */
export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
): Promise<ActionResult> {
  const authz = await authorize("appointments", "edit");
  if (!authz.ok) return authz;
  const parsed = updateStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: "Invalid status change." };

  const appt = appointments.find((a) => a.id === id);
  if (!appt) return { ok: false, message: "Appointment not found." };
  appt.status = status;

  revalidatePath("/admin/appointments");
  revalidatePath("/reception/appointments");
  revalidatePath("/doctor/appointments");
  return { ok: true, message: `Marked as ${status.toLowerCase().replace("_", " ")}.` };
}

/**
 * Move an appointment to a new slot. Blocks clashes with the same doctor's
 * other appointments and stamps the status as RESCHEDULED.
 */
export async function rescheduleAppointmentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<Appointment>> {
  const authz = await authorize("appointments", "edit");
  if (!authz.ok) return authz;

  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const appt = await db.appointments.get(input.id);
  if (!appt) return { ok: false, message: "Appointment not found." };

  const start = new Date(`${input.date}T${input.time}`);
  // Regexes pass out-of-range values like 2026-13-45 — reject Invalid Date
  // before toISOString() can throw.
  if (Number.isNaN(start.getTime())) {
    return { ok: false, message: "Invalid date or time.", fieldErrors: { date: ["Invalid date or time."] } };
  }
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  // Prevent an exact duplicate slot for the same doctor (excluding this one).
  const sameDoctor = await db.appointments.list(
    (a) =>
      a.doctorId === appt.doctorId &&
      a.id !== appt.id &&
      a.scheduledStart === start.toISOString() &&
      a.status !== "CANCELLED",
  );
  if (sameDoctor.length) {
    return { ok: false, message: "That slot is already booked for this doctor." };
  }

  const updated = await db.appointments.update(appt.id, {
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    status: "RESCHEDULED",
  });
  if (!updated) return { ok: false, message: "Appointment not found." };

  logAudit({
    actor: authz.session.user.fullName,
    role: authz.session.user.role,
    action: "UPDATE",
    entity: "Appointment",
    summary: `Rescheduled ${updated.patientName} with ${updated.doctorName} to ${input.date} ${input.time}`,
  });

  revalidatePath("/admin/appointments");
  revalidatePath("/reception/appointments");
  revalidatePath("/doctor/appointments");
  revalidatePath("/portal/appointments");
  return { ok: true, message: "Appointment rescheduled.", data: updated };
}
