import { cookies } from "next/headers";
import { AppShellClient } from "./app-shell-client";
import type { SessionUser } from "@/lib/session";
import { branches, notifications } from "@/server/demo/data";

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
    ? branches.find((b) => b.id === user.branchId)?.name
    : undefined;
  const unread = notifications.filter((n) => !n.read).length;

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
