"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, MessageSquare, Mail, Smartphone, Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification.actions";
import { formatDateTime, humanizeEnum } from "@/lib/format";
import type { NotificationItem } from "@/types/domain";

const CHANNEL_ICON: Record<string, typeof Bell> = {
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  SMS: Smartphone,
  IN_APP: Monitor,
};

function List({
  items,
  onRead,
  pending,
}: {
  items: NotificationItem[];
  onRead: (id: string) => void;
  pending: boolean;
}) {
  if (!items.length) return <EmptyState icon={Bell} title="Nothing here" />;
  return (
    <div className="divide-y rounded-xl border">
      {items.map((n) => {
        const Icon = CHANNEL_ICON[n.channel] ?? Bell;
        return (
          <div key={n.id} className="flex gap-3 px-4 py-3.5">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {n.actionUrl ? (
                  <Link href={n.actionUrl} className="text-sm font-medium hover:underline">
                    {n.title}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{n.title}</p>
                )}
                {!n.read && <span className="size-2 rounded-full bg-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                {formatDateTime(n.createdAt)} · {humanizeEnum(n.channel)} · {humanizeEnum(n.type)}
              </p>
            </div>
            {!n.read && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => onRead(n.id)}
                className="shrink-0 self-center"
              >
                Mark read
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NotificationsView({ notifications }: { notifications: NotificationItem[] }) {
  const [tab, setTab] = useState("all");
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read);

  function markOne(id: string) {
    startTransition(async () => {
      const res = await markNotificationReadAction(id);
      if (!res.ok) toast.error(res.message ?? "Could not mark as read.");
    });
  }

  function markAll() {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.ok) toast.success(res.message ?? "All marked as read.");
      else toast.error(res.message ?? "Could not mark all as read.");
    });
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" disabled={pending || unread.length === 0} onClick={markAll}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Mark all read
        </Button>
      </div>
      <TabsContent value="all" className="mt-4">
        <List items={notifications} onRead={markOne} pending={pending} />
      </TabsContent>
      <TabsContent value="unread" className="mt-4">
        <List items={unread} onRead={markOne} pending={pending} />
      </TabsContent>
    </Tabs>
  );
}
