"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { MasterRowDialog } from "./master-row-dialog";
import { toggleMasterActiveAction } from "@/server/actions/masters.actions";

export interface MasterRow {
  id: string;
  name: string;
  meta?: string;
  active: boolean;
}
export interface MasterGroup {
  key: string;
  label: string;
  rows: readonly MasterRow[];
}

/** Groups shown read-only (derived data — no add/edit/deactivate). */
const READ_ONLY_GROUPS = new Set(["consultation-fees"]);

/** "Departments" → "Department" for dialog titles. */
function singular(label: string): string {
  return label.replace(/ies$/, "y").replace(/s$/, "");
}

export function MastersView({
  groups,
  canManage = false,
}: {
  groups: readonly MasterGroup[];
  canManage?: boolean;
}) {
  const [active, setActive] = useState(groups[0]?.key);
  const [dialog, setDialog] = useState<{ group: string; label: string; row: MasterRow | null } | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleActive(group: string, row: MasterRow) {
    startTransition(async () => {
      const res = await toggleMasterActiveAction(group, row.id, !row.active);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not update the entry.");
    });
  }

  return (
    <>
      <Tabs value={active} onValueChange={setActive}>
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList>
            {groups.map((g) => (
              <TabsTrigger key={g.key} value={g.key}>{g.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        {groups.map((g) => {
          const editable = canManage && !READ_ONLY_GROUPS.has(g.key);
          return (
            <TabsContent key={g.key} value={g.key} className="mt-4">
              <div className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                  <p className="text-sm font-medium">{g.label} · {g.rows.length}</p>
                  {editable && (
                    <Button size="sm" onClick={() => setDialog({ group: g.key, label: singular(g.label), row: null })}>
                      <Plus className="size-4" /> Add
                    </Button>
                  )}
                </div>
                <ul className="divide-y">
                  {g.rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className={cn("min-w-0", !r.active && "opacity-60")}>
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        {r.meta ? <p className="truncate text-xs text-muted-foreground">{r.meta}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <StatusBadge status={r.active ? "ACTIVE" : "INACTIVE"} />
                        {editable && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={`Actions for ${r.name}`}
                              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>{r.name}</DropdownMenuLabel>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={pending}
                                onClick={() => setDialog({ group: g.key, label: singular(g.label), row: r })}
                              >
                                <Pencil className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={pending}
                                variant={r.active ? "destructive" : "default"}
                                onClick={() => toggleActive(g.key, r)}
                              >
                                {r.active ? "Deactivate" : "Reactivate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {dialog && (
        <MasterRowDialog
          key={dialog.row?.id ?? `new-${dialog.group}`}
          group={dialog.group}
          groupLabel={dialog.label}
          row={dialog.row}
          open
          onOpenChange={(o) => { if (!o) setDialog(null); }}
        />
      )}
    </>
  );
}
