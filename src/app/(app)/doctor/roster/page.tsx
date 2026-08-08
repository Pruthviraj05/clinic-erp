import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { doctorLeaves, weeklyRoster } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { RosterView } from "@/features/roster/roster-view";

export const metadata: Metadata = { title: "Roster & Leave" };

export default async function DoctorRosterPage() {
  const { user } = await requireRole("DOCTOR");
  // The demo doctor is Dr. Ananya Mehta.
  const myLeaves = doctorLeaves.filter((l) => l.doctorName === user.fullName);
  return (
    <div>
      <PageHeader title="Roster & leave" description="Your weekly availability and leave requests." />
      <RosterView roster={weeklyRoster} leaves={myLeaves} />
    </div>
  );
}
