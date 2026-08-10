import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { ChangePasswordForm } from "@/features/auth/change-password-form";

export const metadata: Metadata = { title: "Change password" };

/**
 * Reachable any time to change your own password, and forced after signing in
 * with an issued/seed password (the app shell redirects here while
 * `mustChangePassword` is set).
 */
export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const forced = session.user.mustChangePassword;

  return (
    <div className="flex min-h-dvh items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="size-5" /> Account security
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {forced ? "Set a new password" : "Change your password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {forced
              ? "This account is still using the password it was issued with. Choose a new one before continuing — it is the only thing protecting your patients' records."
              : "Changing your password signs out every other device."}
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
