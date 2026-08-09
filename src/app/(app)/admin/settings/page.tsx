import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  const rxTemplate = await db.settings.get();
  return (
    <div>
      <PageHeader title="Settings" description="Organisation, integrations, prescription template and notifications." />
      <SettingsView rxTemplate={rxTemplate} />
    </div>
  );
}
