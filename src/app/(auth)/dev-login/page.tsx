import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { ROLE_HOME } from "@/lib/rbac";
import { RolePicker } from "@/features/auth/role-picker";

export const metadata: Metadata = { title: "Dev sign-in" };

/**
 * Hidden dev-only fallback: role-switcher demo login, reachable regardless of
 * NEXT_PUBLIC_AUTH_MODE. Not linked from the UI — for internal testing only.
 */
export default async function DevLoginPage() {
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
