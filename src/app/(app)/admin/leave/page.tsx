import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { doctorLeaves, weeklyRoster } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { RosterView } from "@/features/roster/roster-view";

export const metadata: Metadata = { title: "Leave & Roster" };

export default async function AdminLeavePage() {
  await requireRole("ADMIN");
  return (
    <div>
      <PageHeader title="Leave & roster" description="Approve leave requests and review doctor availability." />
      <RosterView roster={weeklyRoster} leaves={doctorLeaves} canManageLeaves />
    </div>
  );
}
