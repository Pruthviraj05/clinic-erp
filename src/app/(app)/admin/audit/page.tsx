import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { auditLog } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { AuditView } from "@/features/audit/audit-view";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AdminAuditPage() {
  await requireRole("ADMIN");
  return (
    <div>
      <PageHeader title="Audit log" description="Every action across the system, fully traceable." />
      <AuditView rows={auditLog} />
    </div>
  );
}
