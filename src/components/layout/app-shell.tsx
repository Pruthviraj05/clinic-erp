import { cookies } from "next/headers";
import { AppShellClient } from "./app-shell-client";
import { DemoBanner } from "./demo-banner";
import type { SessionUser } from "@/lib/session";
import { db } from "@/server/repositories";
import { getCachedBranch } from "@/server/cache/reference-data";

/**
 * Authenticated application shell (server). Resolves per-user context and the
 * persisted sidebar state, then hands off to the client shell for interactivity.
 */
export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const branchName = user.branchId
    ? (await getCachedBranch(user.branchId))?.name
    : undefined;
  // Counted, not fetched: this runs on EVERY authenticated page render, so
  // pulling the whole notifications collection here slowed the entire app.
  const [broadcastUnread, ownUnread] = await Promise.all([
    db.notifications.count({ read: false, recipientId: null }),
    user.linkId
      ? db.notifications.count({ read: false, recipientId: user.linkId })
      : Promise.resolve(0),
  ]);
  const unread = broadcastUnread + ownUnread;

  const store = await cookies();
  const initialCollapsed = store.get("cc_sidebar")?.value === "1";

  return (
    <>
      <DemoBanner />
      <AppShellClient
        role={user.role}
        name={user.fullName}
        email={user.email}
        branchName={branchName}
        unread={unread}
        initialCollapsed={initialCollapsed}
      >
        {children}
      </AppShellClient>
    </>
  );
}
