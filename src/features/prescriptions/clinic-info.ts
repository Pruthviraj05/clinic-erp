import { branches, doctors, patients } from "@/server/demo/data";
import { getRxDesign } from "@/server/demo/rx-design-store";
import type { ClinicInfo, RxPatientInfo } from "./prescription-detail";
import type { Prescription } from "@/types/domain";

/**
 * Build everything the printable prescription needs: clinic header from the
 * branch (so branding follows the clinic the doctor is sitting at), doctor
 * credentials, patient identity block, and the prescribing doctor's own
 * design (header/footer/accent/language).
 */
export function clinicInfoFor(rx: Prescription): {
  clinic: ClinicInfo;
  doctorMeta?: string;
  patient?: RxPatientInfo;
  design: ReturnType<typeof getRxDesign>;
} {
  const branch = branches.find((b) => b.id === rx.branchId);
  const doctor = doctors.find((d) => d.id === rx.doctorId);
  const patient = patients.find((p) => p.id === rx.patientId);

  return {
    clinic: {
      name: branch?.name ?? "Clinicore",
      address: [branch?.city].filter(Boolean).join(", ") || "Bengaluru, India",
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
    design: getRxDesign(rx.doctorId),
  };
}
