import "server-only";
import { db } from "@/server/repositories";
import type { Appointment, Invoice, Patient, Prescription } from "@/types/domain";
import type { MedicalRecordItem } from "@/server/demo/extra";

/** Escape user input before it becomes a regex — otherwise "(" throws. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listPatients(search?: string, limit = 500): Promise<Patient[]> {
  const term = search?.trim();
  const query = term
    ? {
        $or: [
          { fullName: { $regex: escapeRegex(term) } },
          { mrn: { $regex: escapeRegex(term) } },
          { phone: { $regex: escapeRegex(term) } },
        ],
      }
    : {};
  return db.patients.find(query, { sort: { fullName: 1 }, limit });
}

export async function getPatient(id: string): Promise<Patient | null> {
  return db.patients.get(id);
}

export interface PatientBundle {
  patient: Patient;
  appointments: Appointment[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  records: MedicalRecordItem[];
}

/**
 * One patient's chart. Every query is pushed into the database and bounded —
 * this used to fetch four ENTIRE collections and filter them in memory, which
 * on a real dataset means transferring hundreds of MB to render ~40 rows.
 */
export async function getPatientBundle(id: string): Promise<PatientBundle | null> {
  const patient = await db.patients.get(id);
  if (!patient) return null;
  const [appointments, prescriptions, invoices, records] = await Promise.all([
    db.appointments.find({ patientId: id }, { sort: { scheduledStart: -1 }, limit: 200 }),
    db.prescriptions.find({ patientId: id }, { sort: { createdAt: -1 }, limit: 200 }),
    db.invoices.find({ patientId: id }, { sort: { createdAt: -1 }, limit: 200 }),
    db.medicalRecords.find({ patientId: id }, { sort: { recordedAt: -1 }, limit: 200 }),
  ]);
  return { patient, appointments, prescriptions, invoices, records };
}
