import { db } from "@/server/repositories";
import { getRxDesignFor } from "@/server/demo/rx-design-store";
import type { ClinicInfo } from "@/features/prescriptions/prescription-detail";
import type { ConsentPatientInfo } from "./consent-detail";
import type { ConsentFormItem } from "@/server/demo/extra";

/**
 * Build everything the printable consent letterhead needs. Branch comes from
 * the form (falling back to the doctor's own branch for legacy rows created
 * before `branchId` existed); the accent colour reuses the doctor's saved Rx
 * design so a doctor's consent forms and prescriptions look like one brand,
 * not two unrelated documents.
 */
export async function consentInfoFor(form: ConsentFormItem): Promise<{
  clinic: ClinicInfo;
  doctorMeta?: string;
  patient?: ConsentPatientInfo;
  accentColor: string;
}> {
  const doctor = form.doctorId ? await db.doctors.get(form.doctorId) : null;
  const branchId = form.branchId ?? doctor?.branchIds[0];
  const [branch, patient, design] = await Promise.all([
    branchId ? db.branches.get(branchId) : Promise.resolve(null),
    db.patients.get(form.patientId),
    form.doctorId ? getRxDesignFor(form.doctorId, branchId) : Promise.resolve(null),
  ]);

  return {
    clinic: {
      name: branch?.name ?? "Clinic",
      address: [branch?.city].filter(Boolean).join(", ") || "",
      phone: branch?.phone ?? "",
      gst: branch?.gstNumber ?? undefined,
    },
    doctorMeta: doctor
      ? [doctor.qualifications, doctor.registrationNo && `Reg. ${doctor.registrationNo}`].filter(Boolean).join(" · ")
      : undefined,
    patient: patient
      ? {
          mrn: patient.mrn,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          phone: patient.phone,
          allergies: patient.allergies,
        }
      : undefined,
    accentColor: design?.accentColor ?? "#0f766e",
  };
}
