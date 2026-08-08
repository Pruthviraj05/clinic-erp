import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorsView } from "@/features/staff/doctors-view";

export const metadata: Metadata = { title: "Doctors" };

export default async function AdminDoctorsPage() {
  const session = await requireRole("ADMIN");
  const role = session.user.role;

  const [branches, doctors] = await Promise.all([db.branches.list(), db.doctors.list()]);
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
        canCreate={can(role, "doctors", "create")}
        canEdit={can(role, "doctors", "edit")}
        canDelete={can(role, "doctors", "delete")}
      />
    </div>
  );
}
