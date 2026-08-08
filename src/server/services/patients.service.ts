import "server-only";
import { appointments, invoices, patients, prescriptions } from "@/server/demo/data";
import { medicalRecords } from "@/server/demo/extra";
import type { Appointment, Invoice, Patient, Prescription } from "@/types/domain";
import type { MedicalRecordItem } from "@/server/demo/extra";

export async function listPatients(search?: string): Promise<Patient[]> {
  let rows = patients.slice();
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
  return patients.find((p) => p.id === id) ?? null;
}

export interface PatientBundle {
  patient: Patient;
  appointments: Appointment[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  records: MedicalRecordItem[];
}

export async function getPatientBundle(id: string): Promise<PatientBundle | null> {
  const patient = patients.find((p) => p.id === id);
  if (!patient) return null;
  return {
    patient,
    appointments: appointments
      .filter((a) => a.patientId === id)
      .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart)),
    prescriptions: prescriptions
      .filter((p) => p.patientId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    invoices: invoices
      .filter((i) => i.patientId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    records: medicalRecords
      .filter((r) => r.patientId === id)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
  };
}
