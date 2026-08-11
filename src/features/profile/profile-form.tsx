"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/section-card";
import { updateProfileAction } from "@/server/actions/profile.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Role } from "@/lib/rbac";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function ProfileForm({
  role,
  fullName,
  email,
  phone,
  qualifications,
  registrationNo,
}: {
  role: Role;
  fullName: string;
  email: string;
  phone?: string;
  qualifications?: string | null;
  registrationNo?: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(updateProfileAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Saved.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];
  const canEditName = role !== "PATIENT";

  return (
    <form action={formAction} className="space-y-4">
      <SectionCard title="Basic details" description="Visible across the app wherever your name is shown.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <input
              id="fullName"
              name="fullName"
              defaultValue={fullName}
              disabled={!canEditName}
              className={fieldClass}
            />
            {!canEditName && (
              <p className="text-xs text-muted-foreground">Ask the front desk to correct your name on file.</p>
            )}
            {err("fullName") && <p className="text-xs text-destructive">{err("fullName")}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <input id="email" value={email} disabled className={fieldClass} />
            <p className="text-xs text-muted-foreground">Used to sign in — contact an admin to change it.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <input id="phone" name="phone" defaultValue={phone ?? ""} placeholder="+91 …" className={fieldClass} />
            {err("phone") && <p className="text-xs text-destructive">{err("phone")}</p>}
          </div>
        </div>
      </SectionCard>

      {role === "DOCTOR" && (
        <SectionCard
          title="Credentials"
          description="Printed under your name on every prescription and consent form letterhead."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <input
                id="qualifications"
                name="qualifications"
                defaultValue={qualifications ?? ""}
                placeholder="MBBS, MD (Rheumatology)"
                className={fieldClass}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="registrationNo">Registration number</Label>
              <input
                id="registrationNo"
                name="registrationNo"
                defaultValue={registrationNo ?? ""}
                placeholder="e.g. MH-12345"
                className={fieldClass}
              />
            </div>
          </div>
        </SectionCard>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
