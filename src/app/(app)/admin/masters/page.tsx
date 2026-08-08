import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { MASTER_GROUPS } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { MastersView } from "@/features/masters/masters-view";

export const metadata: Metadata = { title: "Masters" };

export default async function AdminMastersPage() {
  const session = await requireRole("ADMIN");
  const canManage = can(session.user.role, "masters", "edit");
  return (
    <div>
      <PageHeader title="Masters" description="Configure the building blocks used across the system." />
      <MastersView groups={MASTER_GROUPS} canManage={canManage} />
    </div>
  );
}
