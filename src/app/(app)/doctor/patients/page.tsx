import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listPatients } from "@/server/services/patients.service";
import { PageHeader } from "@/components/shared/page-header";
import { PatientsView } from "@/features/patients/patients-view";

export const metadata: Metadata = { title: "My Patients" };

export default async function DoctorPatientsPage() {
  const { user } = await requireRole("DOCTOR");
  const patients = await listPatients();
  return (
    <div>
      <PageHeader title="My patients" description="Patients you have consulted." />
      <PatientsView
        patients={patients}
        basePath="/doctor/patients"
        canRegister={false}
        canEdit={can(user.role, "patients", "edit")}
        canDelete={can(user.role, "patients", "delete")}
      />
    </div>
  );
}
