import { ShieldAlert } from "lucide-react";
import { isDemoModeEnabled } from "@/lib/session";

/**
 * Always-on reminder that the app is running without passwords.
 *
 * Demo mode lets anyone with the URL sign in as any role, so it must be
 * impossible to leave on without noticing. Rendering nothing when the flag is
 * off keeps it free in normal operation.
 */
export function DemoBanner() {
  if (!isDemoModeEnabled()) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-[var(--warning)] px-4 py-1.5 text-center text-xs font-medium text-black">
      <ShieldAlert className="size-3.5 shrink-0" />
      Demo mode — sign-in is disabled and anyone can switch roles. Do not use with real patient data.
    </div>
  );
}
