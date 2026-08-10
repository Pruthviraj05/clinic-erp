import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { visibleNotifications } from "@/lib/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default async function ReceptionNotificationsPage() {
  const { user } = await requireRole("RECEPTIONIST");
  const notifications = visibleNotifications(await db.notifications.list(), user.linkId);
  return (
    <div>
      <PageHeader title="Notifications" description="Front-desk alerts and reminders." />
      <NotificationsView notifications={notifications} />
    </div>
  );
}
