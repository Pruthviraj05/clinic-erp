import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default async function ReceptionNotificationsPage() {
  await requireRole("RECEPTIONIST");
  const notifications = await db.notifications.list();
  return (
    <div>
      <PageHeader title="Notifications" description="Front-desk alerts and reminders." />
      <NotificationsView notifications={notifications} />
    </div>
  );
}
