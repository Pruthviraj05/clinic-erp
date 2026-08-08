import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { prescriptionTemplate } from "@/server/demo/settings-store";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  return (
    <div>
      <PageHeader title="Settings" description="Organisation, integrations, prescription template and notifications." />
      <SettingsView rxTemplate={{ ...prescriptionTemplate }} />
    </div>
  );
}
