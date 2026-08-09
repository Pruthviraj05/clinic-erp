import "server-only";
import { db } from "@/server/repositories";
import type { Appointment, Invoice, Patient, Prescription } from "@/types/domain";
import type { MedicalRecordItem } from "@/server/demo/extra";

export async function listPatients(search?: string): Promise<Patient[]> {
  let rows = await db.patients.list();
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q),
    );
  }
  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
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

export async function getPatientBundle(id: string): Promise<PatientBundle | null> {
  const patient = await db.patients.get(id);
  if (!patient) return null;
  const [appointments, prescriptions, invoices, records] = await Promise.all([
    db.appointments.list((a) => a.patientId === id),
    db.prescriptions.list((p) => p.patientId === id),
    db.invoices.list((i) => i.patientId === id),
    db.medicalRecords.list((r) => r.patientId === id),
  ]);
  return {
    patient,
    appointments: appointments.sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart)),
    prescriptions: prescriptions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    invoices: invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    records: records.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
  };
}
