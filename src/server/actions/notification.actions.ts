"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/guard";
import { db } from "@/server/repositories";
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
  const { user } = authz.session;

  // Only your own (or a broadcast) notification — the id alone is not
  // authority to mutate someone else's row.
  const existing = await db.notifications.get(id);
  if (!existing) return { ok: false, message: "Notification not found." };
  if (existing.recipientId && existing.recipientId !== user.linkId) {
    return { ok: false, message: "Notification not found." };
  }

  const updated = await db.notifications.update(id, { read: true });
  if (!updated) return { ok: false, message: "Notification not found." };
  revalidateNotificationRoutes();
  return { ok: true, message: "Marked as read." };
}

/** Mark every notification visible to the current user as read. */
export async function markAllNotificationsReadAction(): Promise<ActionResult<{ count: number }>> {
  const authz = await authorize("notifications", "view");
  if (!authz.ok) return authz;
  const { user } = authz.session;
  // Two bulk writes rather than one round-trip per row: 500 unread used to
  // mean 500 sequential updates.
  const broadcast = await db.notifications.updateMany(
    { read: false, recipientId: null },
    { read: true },
  );
  const mine = user.linkId
    ? await db.notifications.updateMany({ read: false, recipientId: user.linkId }, { read: true })
    : 0;
  const unread = { length: broadcast + mine };
  revalidateNotificationRoutes();
  return {
    ok: true,
    message: unread.length ? `Marked ${unread.length} notification(s) as read.` : "Everything is already read.",
    data: { count: unread.length },
  };
}
