"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Send, Loader2, ArrowDownRight, ArrowUpRight, MoreHorizontal, Pencil, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
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
import { formatCurrency, formatDate, formatDateTime, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AddMedicineDialog } from "./add-medicine-dialog";
import { AdjustStockDialog } from "./adjust-stock-dialog";
import { EditMedicineDialog } from "./edit-medicine-dialog";
import { ImportStockDialog } from "./import-stock-dialog";
import { ReceiveStockDialog } from "./receive-stock-dialog";
import { WriteOffDialog } from "./write-off-dialog";
import { DataQualityPanel, ReorderView, WriteOffButton } from "./reorder-view";
import type { ReorderSuggestion } from "@/server/demo/reorder-store";
import { sendLowStockAlertAction, setMedicineActiveAction } from "@/server/actions/inventory.actions";
import type { Medicine, MedicineBatch, StockMovementItem } from "@/types/domain";

function LowStockBanner({ items }: { items: Medicine[] }) {
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  function sendAlert() {
    startTransition(async () => {
      const res = await sendLowStockAlertAction();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not send alerts");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--warning)]" />
        <div>
          <p className="text-sm font-medium">{items.length} item(s) below reorder level</p>
          <p className="text-sm text-muted-foreground">
            {items.slice(0, 3).map((m) => `${m.name} (${m.stockQty} ${m.unit})`).join(", ")}
            {items.length > 3 ? ` +${items.length - 3} more` : ""}
          </p>
        </div>
      </div>
      <Button onClick={sendAlert} disabled={pending} className="shrink-0">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send WhatsApp & email alert
      </Button>
    </div>
  );
}

function MedicineRowActions({
  medicine,
  canEdit,
  canDelete,
}: {
  medicine: Medicine;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function setActive(active: boolean) {
    startTransition(async () => {
      const res = await setMedicineActiveAction(medicine.id, active);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not update the medicine.");
    });
  }

  const canDeactivate = canDelete && medicine.isActive;
  const canReactivate = canEdit && !medicine.isActive;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${medicine.name}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{medicine.name}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {canEdit && (
            <DropdownMenuItem disabled={pending} onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit details
            </DropdownMenuItem>
          )}
          {canDeactivate && (
            <DropdownMenuItem disabled={pending} variant="destructive" onClick={() => setActive(false)}>
              Deactivate
            </DropdownMenuItem>
          )}
          {canReactivate && (
            <DropdownMenuItem disabled={pending} onClick={() => setActive(true)}>
              Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canEdit && <EditMedicineDialog medicine={medicine} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  );
}

/** Days until expiry — negative means already expired. */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ expiry }: { expiry: string | null }) {
  const days = daysUntil(expiry);
  if (days === null) return <span className="text-sm text-muted-foreground">—</span>;
  const tone =
    days < 0
      ? "bg-destructive/10 text-destructive"
      : days <= 30
        ? "bg-[var(--warning)]/15 text-[var(--warning)]"
        : days <= 90
          ? "bg-[var(--info)]/12 text-[var(--info)]"
          : "text-muted-foreground";
  const label = days < 0 ? "Expired" : days <= 90 ? `${days}d left` : formatDate(expiry);
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}

export function InventoryView({
  medicines,
  movements,
  batches,
  suggestions,
  dataQuality,
  suppliers = [],
  canEdit = false,
  canDelete = false,
}: {
  medicines: Medicine[];
  movements: StockMovementItem[];
  batches: MedicineBatch[];
  suggestions: ReorderSuggestion[];
  dataQuality: { key: string; label: string; count: number; why: string }[];
  suppliers?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [tab, setTab] = useState("stock");
  const [writingOff, setWritingOff] = useState<MedicineBatch | null>(null);
  const lowStock = useMemo(() => medicines.filter((m) => m.stockQty <= m.reorderLevel), [medicines]);

  /** Lots still holding stock, nearest expiry first — the FEFO pick order. */
  const liveBatches = useMemo(
    () =>
      [...batches]
        .filter((b) => b.quantity > 0)
        .sort((a, b) => {
          if (a.expiry === b.expiry) return a.receivedAt.localeCompare(b.receivedAt);
          if (!a.expiry) return 1;
          if (!b.expiry) return -1;
          return a.expiry.localeCompare(b.expiry);
        }),
    [batches],
  );

  const attention = useMemo(
    () => liveBatches.filter((b) => { const d = daysUntil(b.expiry); return d !== null && d <= 90; }),
    [liveBatches],
  );

  const stockColumns = useMemo<ColumnDef<Medicine>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Medicine",
        cell: ({ row }) => (
          <div className={cn("leading-tight", !row.original.isActive && "opacity-60")}>
            <div className="font-medium">
              {row.original.name}
              {!row.original.isActive && (
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">Inactive</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.genericName ?? row.original.brand ?? "—"}</div>
          </div>
        ),
      },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "stockQty",
        header: "Available",
        cell: ({ row }) => {
          const low = row.original.stockQty <= row.original.reorderLevel;
          return (
            <span className={cn("font-semibold", low ? "text-[var(--warning)]" : "text-[var(--success)]")}>
              {row.original.stockQty} {row.original.unit}
            </span>
          );
        },
      },
      { accessorKey: "reorderLevel", header: "Reorder at" },
      {
        accessorKey: "sellPrice",
        header: "Price",
        cell: ({ row }) => formatCurrency(row.original.sellPrice),
      },
      {
        accessorKey: "nearestExpiry",
        header: "Expiry",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.nearestExpiry)}</span>,
      },
      {
        id: "updatedBy",
        header: "Updated by",
        cell: ({ row }) =>
          row.original.updatedBy ? (
            <div className="leading-tight">
              <div className="text-sm">{row.original.updatedBy}</div>
              <div className="text-[11px] text-muted-foreground">{formatDate(row.original.updatedAt)}</div>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <AdjustStockDialog medicine={row.original} />
            {(canEdit || canDelete) && (
              <MedicineRowActions medicine={row.original} canEdit={canEdit} canDelete={canDelete} />
            )}
          </div>
        ),
      },
    ],
    [canEdit, canDelete],
  );

  const movementColumns = useMemo<ColumnDef<StockMovementItem>[]>(
    () => [
      {
        accessorKey: "at",
        header: "When",
        cell: ({ row }) => <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.at)}</span>,
      },
      { accessorKey: "medicineName", header: "Medicine" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <span className="text-sm">{humanizeEnum(row.original.type)}</span>,
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => {
          const q = row.original.quantity;
          const up = q >= 0;
          return (
            <span className={cn("inline-flex items-center gap-1 font-medium", up ? "text-[var(--success)]" : "text-destructive")}>
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {up ? "+" : ""}{q}
            </span>
          );
        },
      },
      { accessorKey: "balanceAfter", header: "Balance" },
      { accessorKey: "reason", header: "Reason", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reason}</span> },
      { accessorKey: "by", header: "By" },
      {
        id: "bill",
        header: "Bill",
        cell: ({ row }) =>
          row.original.billPhotoDataUrl ? (
            <a
              href={row.original.billPhotoDataUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Paperclip className="size-3.5" /> View
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const batchColumns = useMemo<ColumnDef<MedicineBatch>[]>(
    () => [
      {
        accessorKey: "medicineName",
        header: "Medicine",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div className="font-medium">{row.original.medicineName}</div>
            <div className="text-xs text-muted-foreground">Batch {row.original.batchNo}</div>
          </div>
        ),
      },
      {
        accessorKey: "expiry",
        header: "Expiry",
        cell: ({ row }) => <ExpiryBadge expiry={row.original.expiry} />,
      },
      {
        accessorKey: "quantity",
        header: "In stock",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.quantity}
            <span className="text-muted-foreground"> / {row.original.receivedQty}</span>
          </span>
        ),
      },
      {
        accessorKey: "costPrice",
        header: "Cost",
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.original.costPrice)}</span>,
      },
      {
        accessorKey: "mrp",
        header: "MRP",
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.original.mrp)}</span>,
      },
      {
        id: "supplier",
        header: "Supplier",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div className="text-sm">{row.original.supplierName ?? "—"}</div>
            {row.original.purchaseBillNo && (
              <div className="text-xs text-muted-foreground">{row.original.purchaseBillNo}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "receivedAt",
        header: "Received",
        cell: ({ row }) => <span className="text-sm whitespace-nowrap">{formatDate(row.original.receivedAt)}</span>,
      },
      ...(canDelete
        ? [
            {
              id: "writeOff",
              header: "",
              cell: ({ row }) => (
                <WriteOffButton onClick={() => setWritingOff(row.original)} />
              ),
            } as ColumnDef<MedicineBatch>,
          ]
        : []),
    ],
    [canDelete],
  );

  return (
    <div className="space-y-4">
      <LowStockBanner items={lowStock} />
      <WriteOffDialog batch={writingOff} onClose={() => setWritingOff(null)} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock">Stock ({medicines.length})</TabsTrigger>
          <TabsTrigger value="reorder">Reorder ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="batches">Batches ({liveBatches.length})</TabsTrigger>
          <TabsTrigger value="expiry">Expiry ({attention.length})</TabsTrigger>
          <TabsTrigger value="movements">Movements ({movements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reorder" className="mt-4 space-y-4">
          <DataQualityPanel issues={dataQuality} />
          <ReorderView suggestions={suggestions} />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <DataTable
            columns={stockColumns}
            data={medicines}
            searchPlaceholder="Search medicine, category…"
            pageSize={12}
            emptyMessage="No medicines found"
            exportName="inventory"
            exportMapper={(m) => ({
              Medicine: m.name,
              Generic: m.genericName ?? "",
              Brand: m.brand ?? "",
              Category: m.category ?? "",
              Available: m.stockQty,
              Unit: m.unit,
              ReorderAt: m.reorderLevel,
              Price: m.sellPrice,
              Expiry: formatDate(m.nearestExpiry),
              UpdatedBy: m.updatedBy ?? "",
            })}
            toolbar={
              canEdit ? (
                <>
                  <ReceiveStockDialog medicines={medicines} suppliers={suppliers} />
                  <ImportStockDialog medicines={medicines} />
                  <AddMedicineDialog />
                </>
              ) : (
                <AddMedicineDialog />
              )
            }
          />
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <DataTable
            columns={batchColumns}
            data={liveBatches}
            searchPlaceholder="Search medicine, batch, supplier…"
            pageSize={15}
            emptyMessage="No stock received yet — use Receive stock to add a batch"
            exportName="batches"
            exportMapper={(b) => ({
              Medicine: b.medicineName,
              Batch: b.batchNo,
              Expiry: formatDate(b.expiry),
              InStock: b.quantity,
              Received: b.receivedQty,
              Cost: b.costPrice,
              MRP: b.mrp,
              Supplier: b.supplierName ?? "",
              Bill: b.purchaseBillNo ?? "",
              ReceivedOn: formatDate(b.receivedAt),
            })}
          />
        </TabsContent>

        <TabsContent value="expiry" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Batches expiring within 90 days, nearest first. Most distributors only accept returns
            <span className="font-medium text-foreground"> before </span> expiry, so this is the window to act in.
          </p>
          <DataTable
            columns={batchColumns}
            data={attention}
            searchPlaceholder="Search medicine, batch, supplier…"
            pageSize={15}
            emptyMessage="Nothing expiring in the next 90 days"
            exportName="expiring-batches"
            exportMapper={(b) => ({
              Medicine: b.medicineName,
              Batch: b.batchNo,
              Expiry: formatDate(b.expiry),
              DaysLeft: daysUntil(b.expiry) ?? "",
              InStock: b.quantity,
              ValueAtCost: b.quantity * b.costPrice,
              Supplier: b.supplierName ?? "",
            })}
          />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <DataTable
            columns={movementColumns}
            data={movements}
            searchPlaceholder="Search medicine, user, reason…"
            pageSize={15}
            emptyMessage="No stock movements yet"
            exportName="stock-movements"
            exportMapper={(mv) => ({
              When: formatDateTime(mv.at),
              Medicine: mv.medicineName,
              Type: humanizeEnum(mv.type),
              Quantity: mv.quantity,
              Balance: mv.balanceAfter,
              Reason: mv.reason,
              By: mv.by,
            })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
