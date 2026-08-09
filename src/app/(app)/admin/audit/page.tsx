import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { AuditView } from "@/features/audit/audit-view";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AdminAuditPage() {
  await requireRole("ADMIN");
  const rows = (await db.auditLog.list()).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div>
      <PageHeader title="Audit log" description="Every action across the system, fully traceable." />
      <AuditView rows={rows} />
    </div>
  );
}
