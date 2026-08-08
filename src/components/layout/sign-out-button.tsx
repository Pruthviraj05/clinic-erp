"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/server/actions/session.actions";

/**
 * Always-visible sign-out control for the sidebar footer.
 * Collapses to an icon-only button when the sidebar is collapsed.
 */
export function SignOutButton({ collapsed }: { collapsed?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void signOut())}
      title="Sign out"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-destructive/10 hover:text-destructive disabled:opacity-60",
        collapsed && "justify-center px-0",
      )}
    >
      {pending ? <Loader2 className="size-4.5 shrink-0 animate-spin" /> : <LogOut className="size-4.5 shrink-0" />}
      {!collapsed && <span>Sign out</span>}
    </button>
  );
}
