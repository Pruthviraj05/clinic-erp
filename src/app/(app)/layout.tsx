import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Shared layout for every authenticated section. Establishes the session and
 * renders the app shell. Per-role access is enforced by each section's own
 * layout via `requireRole`.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AppShell user={session.user}>{children}</AppShell>;
}
