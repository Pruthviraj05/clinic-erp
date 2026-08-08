import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { ROLE_HOME } from "@/lib/rbac";
import { appConfig } from "@/config/app.config";
import { RolePicker } from "@/features/auth/role-picker";
import { PasswordForm } from "@/features/auth/password-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // If already "signed in" (demo cookie present), skip straight to the app.
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.user.role]);

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* Brand / marketing panel */}
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Activity className="size-5" />
          </div>
          {appConfig.name}
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            The operating system for modern multi-branch clinics.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Appointments, EMR, prescriptions, billing, inventory and analytics —
            unified across every branch, doctor and patient.
          </p>
          <ul className="grid max-w-md grid-cols-2 gap-3 text-sm text-primary-foreground/85">
            {[
              "Multi-branch management",
              "Electronic medical records",
              "Smart appointment queue",
              "GST-ready billing",
              "WhatsApp & email reminders",
              "Real-time analytics",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary-foreground/70" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-2 text-sm text-primary-foreground/70">
          <ShieldCheck className="size-4" />
          Encryption-ready · Audit-logged · Role-based access
        </div>
      </div>

      {/* Role selection panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary lg:hidden">
              <Activity className="size-5" /> {appConfig.name}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              {appConfig.authMode === "credentials"
                ? "Sign in with your clinic account."
                : "Choose a role to continue. Password sign-in is built but switched off in this preview."}
            </p>
          </div>

          {appConfig.authMode === "credentials" ? <PasswordForm /> : <RolePicker />}

          <p className="text-center text-xs text-muted-foreground">
            {appConfig.authMode === "credentials"
              ? "Trouble signing in? Contact your clinic administrator."
              : "Email/password sign-in is ready — set NEXT_PUBLIC_AUTH_MODE=credentials to enable it."}
          </p>
        </div>
      </div>
    </div>
  );
}
