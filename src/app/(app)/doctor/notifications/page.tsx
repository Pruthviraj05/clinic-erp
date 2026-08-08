import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { notifications } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default async function DoctorNotificationsPage() {
  await requireRole("DOCTOR");
  return (
    <div>
      <PageHeader title="Notifications" description="Your appointment and follow-up alerts." />
      <NotificationsView notifications={notifications} />
    </div>
  );
}
