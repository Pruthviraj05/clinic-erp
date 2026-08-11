import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getBillDesignFor } from "@/server/demo/bill-design-store";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  const [rxTemplate, pharmacyDesign, consultationDesign] = await Promise.all([
    db.settings.get(),
    getBillDesignFor("PHARMACY"),
    getBillDesignFor("CONSULTATION"),
  ]);
  return (
    <div>
      <PageHeader title="Settings" description="Organisation, integrations, prescription template and notifications." />
      <SettingsView rxTemplate={rxTemplate} pharmacyDesign={pharmacyDesign} consultationDesign={consultationDesign} />
    </div>
  );
}
