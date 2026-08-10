"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/server/actions/password.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    changePasswordAction,
    null,
  );
  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className={fieldClass}
        />
        {err("currentPassword") && <p className="text-xs text-destructive">{err("currentPassword")}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className={fieldClass}
        />
        <p className="text-xs text-muted-foreground">At least 12 characters. A short phrase works well.</p>
        {err("newPassword") && <p className="text-xs text-destructive">{err("newPassword")}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={fieldClass}
        />
        {err("confirmPassword") && <p className="text-xs text-destructive">{err("confirmPassword")}</p>}
      </div>

      {state && !state.ok && state.message && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Update password
      </Button>
    </form>
  );
}
