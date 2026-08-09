import { db } from "@/server/repositories";

/**
 * Disease-wise patient groups. Doctors organise their patients into named
 * condition lists (RA, OA, Gout…) and add a patient to a list right from the
 * consult screen. Stored via `db.diseaseGroups`.
 */
export interface DiseaseGroup {
  id: string;
  doctorId: string;
  name: string;
  patientIds: string[];
  createdAt: string;
}

let seq = 100;

export async function groupsForDoctor(doctorId: string): Promise<DiseaseGroup[]> {
  return db.diseaseGroups.list((g) => g.doctorId === doctorId);
}

export async function createGroup(doctorId: string, name: string): Promise<DiseaseGroup> {
  const group: DiseaseGroup = {
    id: `dg_${seq++}`,
    doctorId,
    name,
    patientIds: [],
    createdAt: new Date().toISOString(),
  };
  return db.diseaseGroups.insert(group);
}
