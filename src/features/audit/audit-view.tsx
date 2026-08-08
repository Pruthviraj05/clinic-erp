"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { DateNavigator, isOnDay } from "@/components/shared/date-navigator";
import { formatDateTime, humanizeEnum } from "@/lib/format";
import type { AuditRow } from "@/server/demo/extra";

export function AuditView({ rows }: { rows: AuditRow[] }) {
  const [day, setDay] = useState<string | null>(null);
  const data = useMemo(() => rows.filter((r) => isOnDay(r.at, day)), [rows, day]);
  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        accessorKey: "at",
        header: "Time",
        cell: ({ row }) => <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.at)}</span>,
      },
      {
        accessorKey: "actor",
        header: "Actor",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div className="font-medium">{row.original.actor}</div>
            <div className="text-xs text-muted-foreground">{row.original.role}</div>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {humanizeEnum(row.original.action)}
          </span>
        ),
      },
      { accessorKey: "entity", header: "Entity" },
      {
        accessorKey: "summary",
        header: "Details",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.summary}</span>,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search actor, entity, action…"
      pageSize={15}
      emptyMessage="No audit records"
      exportName="audit-log"
      exportMapper={(r) => ({
        Time: formatDateTime(r.at),
        Actor: r.actor,
        Role: r.role,
        Action: humanizeEnum(r.action),
        Entity: r.entity,
        Details: r.summary,
      })}
      toolbar={<DateNavigator value={day} onChange={setDay} />}
    />
  );
}
