import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { BranchesView } from "@/features/staff/branches-view";

export const metadata: Metadata = { title: "Branches" };

export default async function AdminBranchesPage() {
  const session = await requireRole("ADMIN");
  const role = session.user.role;

  const [branches, doctors, receptionists] = await Promise.all([
    db.branches.list(),
    db.doctors.list(),
    db.receptionists.list(),
  ]);

  const staffCounts = Object.fromEntries(
    branches.map((b) => [
      b.id,
      {
        doctors: doctors.filter((d) => d.branchIds.includes(b.id)).length,
        receptionists: receptionists.filter((r) => r.branchId === b.id).length,
      },
    ]),
  );

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Unlimited clinic branches, each with its own staff and settings."
      />
      <BranchesView
        branches={branches}
        staffCounts={staffCounts}
        canCreate={can(role, "branches", "create")}
        canEdit={can(role, "branches", "edit")}
        canDelete={can(role, "branches", "delete")}
      />
    </div>
  );
}
