"use server";

import { getSession } from "@/lib/session";
import { can } from "@/lib/rbac";
import { doctors, medicines, PORTAL_PATIENT_ID } from "@/server/demo/data";
import { consentForms } from "@/server/demo/extra";
import { listPatients } from "@/server/services/patients.service";
import { listAppointments } from "@/server/services/appointments.service";
import { listPrescriptions } from "@/server/services/prescriptions.service";
import { listInvoices } from "@/server/services/billing.service";
import { formatDate, formatTime, humanizeEnum } from "@/lib/format";
import { ROLE_BASE } from "@/config/navigation";

export interface SearchHit {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchResults {
  patients: SearchHit[];
  appointments: SearchHit[];
  prescriptions: SearchHit[];
  invoices: SearchHit[];
  doctors: SearchHit[];
  medicines: SearchHit[];
  consent: SearchHit[];
}

const EMPTY: SearchResults = {
  patients: [],
  appointments: [],
  prescriptions: [],
  invoices: [],
  doctors: [],
  medicines: [],
  consent: [],
};

const LIMIT = 6;

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => f && f.toLowerCase().includes(query));
}

/**
 * Global search — one query fanned out across every module the caller may
 * view, respecting the same scoping the list pages use (doctor → own
 * patients/appointments/prescriptions, receptionist → own branch, patient →
 * own records only). Each category caps at 6 hits; results deep-link into
 * the role-prefixed detail route where one exists.
 */
export async function globalSearchAction(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return EMPTY;

  const session = await getSession();
  if (!session) return EMPTY;
  const { user } = session;
  const base = ROLE_BASE[user.role];

  const results: SearchResults = {
    patients: [],
    appointments: [],
    prescriptions: [],
    invoices: [],
    doctors: [],
    medicines: [],
    consent: [],
  };

  if (can(user.role, "patients", "view")) {
    const rows = await listPatients(rawQuery.trim());
    results.patients = rows.slice(0, LIMIT).map((p) => ({
      id: p.id,
      title: p.fullName,
      subtitle: `${p.mrn} · ${p.phone}`,
      href: `${base}/patients/${p.id}`,
    }));
  }

  if (can(user.role, "appointments", "view")) {
    const rows = await listAppointments(user, { range: "all" });
    results.appointments = rows
      .filter((a) => matches(query, a.patientName, a.doctorName, a.patientMrn, a.reason))
      .slice(0, LIMIT)
      .map((a) => ({
        id: a.id,
        title: `${a.patientName} · ${a.doctorName}`,
        subtitle: `${formatDate(a.scheduledStart)} ${formatTime(a.scheduledStart)} · ${humanizeEnum(a.status)}`,
        href: `${base}/appointments`,
      }));
  }

  if (can(user.role, "prescriptions", "view")) {
    const rows = await listPrescriptions(user);
    results.prescriptions = rows
      .filter((p) => matches(query, p.patientName, p.doctorName, ...p.diagnoses, ...p.medicines.map((m) => m.name)))
      .slice(0, LIMIT)
      .map((p) => ({
        id: p.id,
        title: p.patientName,
        subtitle: p.diagnoses.join(", ") || p.medicines.map((m) => m.name).join(", ") || formatDate(p.createdAt),
        href: `${base}/prescriptions/${p.id}`,
      }));
  }

  if (can(user.role, "billing", "view")) {
    const rows = await listInvoices(user, user.role === "PATIENT" ? PORTAL_PATIENT_ID : undefined);
    results.invoices = rows
      .filter((i) => matches(query, i.number, i.patientName))
      .slice(0, LIMIT)
      .map((i) => ({
        id: i.id,
        title: i.number,
        subtitle: `${i.patientName} · ${humanizeEnum(i.paymentStatus)}`,
        href: `${base}/billing/${i.id}`,
      }));
  }

  if (can(user.role, "doctors", "view")) {
    results.doctors = doctors
      .filter((d) => matches(query, d.fullName, d.specialization, d.registrationNo))
      .slice(0, LIMIT)
      .map((d) => ({
        id: d.id,
        title: d.fullName,
        subtitle: d.specialization ?? undefined,
        href: `${base}/doctors`,
      }));
  }

  if (can(user.role, "inventory", "view")) {
    results.medicines = medicines
      .filter((m) => matches(query, m.name, m.genericName, m.brand, m.category))
      .slice(0, LIMIT)
      .map((m) => ({
        id: m.id,
        title: m.name,
        subtitle: `${m.stockQty} ${m.unit} in stock`,
        href: `${base}/inventory`,
      }));
  }

  if (can(user.role, "consent", "view")) {
    const scoped =
      user.role === "PATIENT" ? consentForms.filter((c) => c.patientId === PORTAL_PATIENT_ID) : consentForms;
    results.consent = scoped
      .filter((c) => matches(query, c.title, c.patientName, c.doctorName))
      .slice(0, LIMIT)
      .map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: `${c.patientName} · ${humanizeEnum(c.status)}`,
        href: `${base}/consent`,
      }));
  }

  return results;
}
