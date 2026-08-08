"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { notifications } from "@/server/demo/data";
import type { ActionResult } from "./appointment.actions";

const NOTIFICATION_ROUTES = [
  "/admin/notifications",
  "/doctor/notifications",
  "/reception/notifications",
  "/portal/notifications",
];

function revalidateNotificationRoutes() {
  for (const route of NOTIFICATION_ROUTES) revalidatePath(route);
}

/** Mark one notification as read. Own read-state, so "view" is enough. */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const authz = await authorize("notifications", "view");
  if (!authz.ok) return authz;
  const item = notifications.find((n) => n.id === id);
  if (!item) return { ok: false, message: "Notification not found." };
  item.read = true;
  revalidateNotificationRoutes();
  return { ok: true, message: "Marked as read." };
}

/** Mark every notification as read. */
export async function markAllNotificationsReadAction(): Promise<ActionResult<{ count: number }>> {
  const authz = await authorize("notifications", "view");
  if (!authz.ok) return authz;
  let count = 0;
  for (const n of notifications) {
    if (!n.read) {
      n.read = true;
      count += 1;
    }
  }
  revalidateNotificationRoutes();
  return {
    ok: true,
    message: count ? `Marked ${count} notification(s) as read.` : "Everything is already read.",
    data: { count },
  };
}
