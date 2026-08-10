import { cookies } from "next/headers";
import { AppShellClient } from "./app-shell-client";
import type { SessionUser } from "@/lib/session";
import { db } from "@/server/repositories";
import { isVisibleTo } from "@/lib/notifications";

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
    ? (await db.branches.get(user.branchId))?.name
    : undefined;
  const unread = (await db.notifications.list((n) => !n.read && isVisibleTo(n, user.linkId))).length;

  const store = await cookies();
  const initialCollapsed = store.get("cc_sidebar")?.value === "1";

  return (
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
  );
}
