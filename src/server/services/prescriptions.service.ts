import "server-only";
import { db } from "@/server/repositories";
import type { Prescription } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

function scopeDoctorId(user: SessionUser): string | undefined {
  return user.role === "DOCTOR" ? user.linkId : undefined;
}

export async function listPrescriptions(
  user: SessionUser,
  patientId?: string,
): Promise<Prescription[]> {
  const docId = scopeDoctorId(user);
  let rows = await db.prescriptions.list();
  if (docId) rows = rows.filter((p) => p.doctorId === docId);
  if (patientId) rows = rows.filter((p) => p.patientId === patientId);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPrescription(id: string): Promise<Prescription | null> {
  return db.prescriptions.get(id);
}
