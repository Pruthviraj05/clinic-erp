import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listPatients } from "@/server/services/patients.service";
import { PageHeader } from "@/components/shared/page-header";
import { PatientsView } from "@/features/patients/patients-view";

export const metadata: Metadata = { title: "Patients" };

export default async function AdminPatientsPage() {
  const { user } = await requireRole("ADMIN");
  const patients = await listPatients();
  return (
    <div>
      <PageHeader title="Patients" description="Registry across all branches." />
      <PatientsView
        patients={patients}
        basePath="/admin/patients"
        canRegister={can(user.role, "patients", "create")}
        canEdit={can(user.role, "patients", "edit")}
        canDelete={can(user.role, "patients", "delete")}
      />
    </div>
  );
}
