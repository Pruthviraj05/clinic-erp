"use client";

import { useState } from "react";
import { CalendarOff, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import type { LeaveItem } from "@/server/demo/extra";

interface RosterDay {
  day: string;
  hours: string;
  branch: string;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RosterView({
  roster,
  leaves,
  canManageLeaves = false,
}: {
  roster: RosterDay[];
  leaves: LeaveItem[];
  canManageLeaves?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function requestLeave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setOpen(false);
      toast.success("Leave request submitted (demo)");
    }, 500);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Weekly roster" description="Your consulting hours per branch" noPadding>
        <div className="divide-y">
          {roster.map((r) => (
            <div key={r.day} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{r.day}</p>
                <p className="text-xs text-muted-foreground">{r.branch}</p>
              </div>
              <span className={r.hours === "Off" ? "text-sm text-muted-foreground" : "text-sm font-medium"}>
                {r.hours}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Leave"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" /> Request leave
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Request leave</DialogTitle>
              </DialogHeader>
              <form onSubmit={requestLeave} className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="from">From</Label>
                    <input id="from" type="date" className={fieldClass} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="to">To</Label>
                    <input id="to" type="date" className={fieldClass} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason</Label>
                  <input id="reason" className={fieldClass} placeholder="e.g. Conference" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />} Submit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
        noPadding
      >
        {leaves.length ? (
          <div className="divide-y">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {formatDate(l.from)}{l.from !== l.to ? ` – ${formatDate(l.to)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {canManageLeaves ? `${l.doctorName} · ` : ""}{l.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={l.status} />
                  {canManageLeaves && l.status === "PENDING" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => toast.success("Approved (demo)")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => toast.success("Rejected (demo)")}>Reject</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CalendarOff className="size-6" /> No leave records
          </div>
        )}
      </SectionCard>
    </div>
  );
}
