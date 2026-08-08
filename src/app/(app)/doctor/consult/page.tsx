import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { listAppointments } from "@/server/services/appointments.service";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Consult" };

/** Today's queue — the doctor picks a patient and starts the consultation. */
export default async function DoctorConsultQueuePage() {
  const { user } = await requireRole("DOCTOR");
  const today = await listAppointments(user, { range: "today" });
  const actionable = today.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status));

  return (
    <div>
      <PageHeader
        title="Consultation queue"
        description="Today's patients — open one to write the prescription in under two minutes."
      />
      <SectionCard noPadding>
        {actionable.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Stethoscope}
              title="No patients in today's queue"
              description="Appointments scheduled for today will appear here."
            />
          </div>
        ) : (
          <ul>
            {actionable.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                    {a.tokenNumber ?? "—"}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate font-medium">{a.patientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTime(a.scheduledStart)} · {a.reason ?? "Consultation"} · {a.patientMrn}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status === "COMPLETED" ? (
                    <span className="text-xs text-muted-foreground">Done</span>
                  ) : (
                    <Link href={`/doctor/consult/${a.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                      Start <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
