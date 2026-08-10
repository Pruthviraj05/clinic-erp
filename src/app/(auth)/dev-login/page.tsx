import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { ROLE_HOME } from "@/lib/rbac";
import { isDemoLoginEnabled } from "@/lib/session";
import { RolePicker } from "@/features/auth/role-picker";

export const metadata: Metadata = { title: "Dev sign-in" };

/**
 * Dev-only role-switcher. This grants a full session with NO password, so it
 * must never exist once real credentials are in use — `isDemoLoginEnabled()`
 * is the single gate, shared with `getSession()` and `signInAs()`.
 */
export default async function DevLoginPage() {
  if (!isDemoLoginEnabled()) notFound();
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.user.role]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
            <ShieldAlert className="size-5" /> Dev-only demo sign-in
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Choose a role</h2>
          <p className="text-sm text-muted-foreground">
            This bypasses real credentials and is not linked from the app. Use only for internal testing.
          </p>
        </div>
        <RolePicker />
      </div>
    </div>
  );
}
