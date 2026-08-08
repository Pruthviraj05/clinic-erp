import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { notifications } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default async function PortalNotificationsPage() {
  await requireRole("PATIENT");
  // Patient-facing reminders only.
  const items = notifications.filter((n) =>
    ["APPOINTMENT_REMINDER", "FOLLOWUP_REMINDER", "PAYMENT_CONFIRMATION", "PRESCRIPTION_SHARED"].includes(n.type),
  );
  return (
    <div>
      <PageHeader title="Notifications" description="Reminders and updates about your care." />
      <NotificationsView notifications={items} />
    </div>
  );
}
