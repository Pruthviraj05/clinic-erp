"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, ShieldPlus, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { createAdminAction, setUserActiveAction } from "@/server/actions/admin-users.actions";
import { formatDate } from "@/lib/format";
import type { ActionResult } from "@/server/actions/appointment.actions";

export interface AccountRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminUsersView({ accounts, canManage }: { accounts: AccountRow[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction, submitting] = useActionState<ActionResult | null, FormData>(createAdminAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Administrator created.");
      setOpen(false);
      formRef.current?.reset();
    } else if (state.message) toast.error(state.message);
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  function toggleActive(row: AccountRow) {
    startTransition(async () => {
      const res = await setUserActiveAction(row.id, !row.isActive);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not update the account.");
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <ShieldPlus className="size-4" /> Add administrator
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add administrator</DialogTitle>
                <DialogDescription>
                  Creates an admin account with full access. It becomes sign-in-able when password login is switched on.
                </DialogDescription>
              </DialogHeader>
              <form ref={formRef} action={formAction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="au-name">Full name</Label>
                  <input id="au-name" name="fullName" className={fieldClass} placeholder="e.g. Priya Deshmukh" />
                  {err("fullName") && <p className="text-xs text-destructive">{err("fullName")}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="au-email">Email</Label>
                  <input id="au-email" name="email" type="email" className={fieldClass} placeholder="name@clinic.app" />
                  {err("email") && <p className="text-xs text-destructive">{err("email")}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="au-password">Temporary password</Label>
                  <input id="au-password" name="password" type="password" className={fieldClass} placeholder="Min 8 chars, letter + number" />
                  {err("password") && <p className="text-xs text-destructive">{err("password")}</p>}
                </div>
                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 animate-spin" />} Create administrator
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <SectionCard noPadding>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <UserCog className="size-4 text-primary" /> {a.fullName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3">{a.role}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleActive(a)}
                      >
                        {a.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
