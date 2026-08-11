import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getCachedBranches, getCachedDoctors, getCachedMasters } from "@/server/cache/reference-data";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorsView } from "@/features/staff/doctors-view";

export const metadata: Metadata = { title: "Doctors" };

export default async function AdminDoctorsPage() {
  const session = await requireRole("ADMIN");
  const role = session.user.role;

  const [branches, doctors, specializationRows, departmentRows] = await Promise.all([
    getCachedBranches(),
    getCachedDoctors(),
    getCachedMasters("specializations"),
    getCachedMasters("departments"),
  ]);
  const specializations = specializationRows.filter((s) => s.active);
  const departments = departmentRows.filter((d) => d.active);
  const branchNames = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div>
      <PageHeader title="Doctors" description="Manage doctors and their branch assignments." />
      <DoctorsView
        doctors={doctors}
        branchNames={branchNames}
        branchOptions={branchOptions}
        specializationOptions={specializations.map((s) => s.name)}
        departmentOptions={departments.map((d) => d.name)}
        canCreate={can(role, "doctors", "create")}
        canEdit={can(role, "doctors", "edit")}
        canDelete={can(role, "doctors", "delete")}
      />
    </div>
  );
}
