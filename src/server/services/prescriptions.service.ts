import "server-only";
import { db } from "@/server/repositories";
import type { Query } from "@/server/repositories/storage-port";
import type { Prescription } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

/**
 * Scoping is FAIL-CLOSED: a doctor or patient whose `linkId` is missing sees
 * nothing, rather than everything. A stale or half-provisioned account must
 * never fall through to the whole clinic's clinical records.
 */
export async function listPrescriptions(
  user: SessionUser,
  patientId?: string,
): Promise<Prescription[]> {
  const query: Query = {};

  if (user.role === "DOCTOR") {
    if (!user.linkId) return [];
    query.doctorId = user.linkId;
  } else if (user.role === "PATIENT") {
    if (!user.linkId) return [];
    // A patient only ever sees their own, whatever the caller passed.
    query.patientId = user.linkId;
  }

  if (patientId) {
    if (query.patientId && query.patientId !== patientId) return [];
    query.patientId = patientId;
  }

  return db.prescriptions.find(query, { sort: { createdAt: -1 } });
}

/** Scoped single read — doctors get their own, patients get their own. */
export async function getPrescription(
  id: string,
  user?: SessionUser,
): Promise<Prescription | null> {
  const rx = await db.prescriptions.get(id);
  if (!rx || !user) return rx;
  if (user.role === "DOCTOR" && rx.doctorId !== user.linkId) return null;
  if (user.role === "PATIENT" && rx.patientId !== user.linkId) return null;
  return rx;
}
