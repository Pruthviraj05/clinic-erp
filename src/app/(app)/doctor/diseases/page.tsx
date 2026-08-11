import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope, Users } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { groupsForDoctor } from "@/server/demo/disease-store";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NewDiseaseListDialog } from "@/features/diseases/new-disease-list-dialog";
import { formatAge, formatDate, humanizeEnum } from "@/lib/format";

export const metadata: Metadata = { title: "Disease lists" };

/** Doctor's patients grouped by condition. Lists are built during consults. */
export default async function DoctorDiseasesPage() {
  const { user } = await requireRole("DOCTOR");
  const [groups, patients] = await Promise.all([
    groupsForDoctor(user.linkId ?? user.id),
    db.patients.list(),
  ]);
  const byId = new Map(patients.map((p) => [p.id, p]));
  const totalTagged = new Set(groups.flatMap((g) => g.patientIds)).size;

  return (
    <div>
      <PageHeader
        title="Disease lists"
        description={`${groups.length} condition list(s) · ${totalTagged} patient(s) tagged.`}
        actions={<NewDiseaseListDialog />}
      />

      {groups.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Stethoscope}
            title="No disease lists yet"
            description="Create a list here, or start one from any consultation."
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <SectionCard
              key={g.id}
              title={g.name}
              description={`${g.patientIds.length} patient(s)`}
              noPadding
            >
              {g.patientIds.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  No patients in this list yet.
                </p>
              ) : (
                <ul>
                  {g.patientIds.map((pid) => {
                    const p = byId.get(pid);
                    if (!p) return null;
                    return (
                      <li key={pid} className="border-b last:border-0">
                        <Link
                          href={`/doctor/patients/${p.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.mrn} · {formatAge(p.dateOfBirth)} · {humanizeEnum(p.gender)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {p.lastVisitAt ? formatDate(p.lastVisitAt) : "—"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex items-center gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground">
                <Users className="size-3.5" /> Created {formatDate(g.createdAt)}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
