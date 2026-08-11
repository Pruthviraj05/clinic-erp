import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getRxDesignFor, RX_ACCENTS } from "@/server/demo/rx-design-store";
import { PageHeader } from "@/components/shared/page-header";
import { RxDesignForm } from "@/features/prescriptions/rx-design-form";

export const metadata: Metadata = { title: "Prescription design" };

export default async function DoctorRxDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { user } = await requireRole("DOCTOR");
  const { branchId: rawBranchId } = await searchParams;
  // Only accept a branch this doctor actually works at.
  const branchId = rawBranchId && user.branchIds.includes(rawBranchId) ? rawBranchId : undefined;

  const [design, allBranches] = await Promise.all([
    getRxDesignFor(user.linkId ?? user.id, branchId),
    user.branchIds.length > 1 ? db.branches.list() : Promise.resolve([]),
  ]);
  const branches = allBranches.filter((b) => user.branchIds.includes(b.id));

  return (
    <div>
      <PageHeader
        title="Prescription design"
        description="Your own header, footer, accent colour, print language and section order."
      />
      <RxDesignForm
        // Force a remount on branch switch — the form's fields are seeded from
        // `design` only on mount, and this stays the same route/component
        // instance across a searchParam-only navigation otherwise, so a stale
        // design would keep showing after switching branches.
        key={branchId ?? "default"}
        design={design}
        accents={[...RX_ACCENTS]}
        branchOptions={branches.map((b) => ({ id: b.id, label: b.name }))}
        currentBranchId={branchId}
      />
    </div>
  );
}
