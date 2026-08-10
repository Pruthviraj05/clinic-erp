import type { NotificationItem } from "@/types/domain";

/** A notification with no `recipientId` is a broadcast — everyone sees it. */
export function isVisibleTo(n: NotificationItem, linkId?: string): boolean {
  return !n.recipientId || n.recipientId === linkId;
}

export function visibleNotifications(all: NotificationItem[], linkId?: string): NotificationItem[] {
  return all.filter((n) => isVisibleTo(n, linkId));
}
