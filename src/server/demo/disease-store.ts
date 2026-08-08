/**
 * Disease-wise patient groups (demo store). Doctors organise their patients
 * into named condition lists (Diabetes, PCOS, Migraine…) and add a patient to
 * a list right from the consult screen. MongoDB: `disease_groups` collection
 * keyed by doctorId with a patientIds array (or a join collection at scale).
 */
export interface DiseaseGroup {
  id: string;
  doctorId: string;
  name: string;
  patientIds: string[];
  createdAt: string;
}

let seq = 100;

export const diseaseGroups: DiseaseGroup[] = [
  { id: "dg_acne", doctorId: "doc_mehta", name: "Acne", patientIds: ["pat_arjun", "pat_ananya"], createdAt: new Date().toISOString() },
  { id: "dg_pigment", doctorId: "doc_mehta", name: "Pigmentation", patientIds: ["pat_isha"], createdAt: new Date().toISOString() },
  { id: "dg_hairfall", doctorId: "doc_mehta", name: "Hair fall", patientIds: [], createdAt: new Date().toISOString() },
];

export function groupsForDoctor(doctorId: string): DiseaseGroup[] {
  return diseaseGroups.filter((g) => g.doctorId === doctorId);
}

export function createGroup(doctorId: string, name: string): DiseaseGroup {
  const group: DiseaseGroup = {
    id: `dg_${seq++}`,
    doctorId,
    name,
    patientIds: [],
    createdAt: new Date().toISOString(),
  };
  diseaseGroups.push(group);
  return group;
}
