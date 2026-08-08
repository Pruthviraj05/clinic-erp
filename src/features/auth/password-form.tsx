"use client";

import { useActionState, useEffect } from "react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { signInWithPassword, type SignInResult } from "@/server/actions/session.actions";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Email + password sign-in. Rendered only when
 * `appConfig.authMode === "credentials"` — the code path is complete and
 * tested against the users store, but the app ships in demo mode.
 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(
    signInWithPassword,
    null,
  );

  useEffect(() => {
    if (state && !state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="login-email">Email</Label>
        <input id="login-email" name="email" type="email" autoComplete="email" className={fieldClass} placeholder="you@clinic.app" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="login-password">Password</Label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" className={fieldClass} />
      </div>
      {state && !state.ok && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in
      </Button>
    </form>
  );
}
