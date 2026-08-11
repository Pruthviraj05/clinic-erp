import { db } from "@/server/repositories";
import { getCachedBranch, getCachedDoctor } from "@/server/cache/reference-data";
import { getRxDesignFor, type RxDesign } from "@/server/demo/rx-design-store";
import type { ClinicInfo, RxPatientInfo } from "./prescription-detail";
import type { Prescription } from "@/types/domain";

/**
 * Build everything the printable prescription needs: clinic header from the
 * branch (so branding follows the clinic the doctor is sitting at), doctor
 * credentials, patient identity block, and the prescribing doctor's own
 * design (header/footer/accent/language).
 */
export async function clinicInfoFor(rx: Prescription): Promise<{
  clinic: ClinicInfo;
  doctorMeta?: string;
  patient?: RxPatientInfo;
  design: RxDesign;
}> {
  const [branch, doctor, patient, design] = await Promise.all([
    getCachedBranch(rx.branchId),
    getCachedDoctor(rx.doctorId),
    db.patients.get(rx.patientId),
    getRxDesignFor(rx.doctorId, rx.branchId),
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
    design,
  };
}
