import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { db } from "@/server/repositories";
import { getCachedBranches } from "@/server/cache/reference-data";
import { PageHeader } from "@/components/shared/page-header";
import { ReceptionistsView } from "@/features/staff/receptionists-view";

export const metadata: Metadata = { title: "Receptionists" };

export default async function AdminReceptionistsPage() {
  const session = await requireRole("ADMIN");
  const role = session.user.role;

  const [branches, receptionists] = await Promise.all([
    getCachedBranches(),
    db.receptionists.list(),
  ]);
  const branchNames = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div>
      <PageHeader title="Receptionists" description="Front-desk staff and branch assignments." />
      <ReceptionistsView
        receptionists={receptionists}
        branchNames={branchNames}
        branchOptions={branchOptions}
        canCreate={can(role, "receptionists", "create")}
        canEdit={can(role, "receptionists", "edit")}
        canDelete={can(role, "receptionists", "delete")}
      />
    </div>
  );
}
