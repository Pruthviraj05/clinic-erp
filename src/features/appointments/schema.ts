import { z } from "zod";
import { appointmentStatuses, appointmentTypes } from "./constants";

export { appointmentStatuses, appointmentTypes };

export const createAppointmentSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  patientId: z.string().min(1, "Select a patient"),
  doctorId: z.string().min(1, "Select a doctor"),
  type: z.enum(appointmentTypes).default("SCHEDULED"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  durationMinutes: z.coerce.number().int().min(5).max(240).default(15),
  reason: z.string().max(280).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(appointmentStatuses),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const rescheduleSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  durationMinutes: z.coerce.number().int().min(5).max(240).default(15),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;
