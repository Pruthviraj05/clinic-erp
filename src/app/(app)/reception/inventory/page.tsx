import type { Metadata } from "next";
import { Package, AlertTriangle, CalendarClock, IndianRupee } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { db } from "@/server/repositories";
import { getCachedMasters } from "@/server/cache/reference-data";
import { dataQualityIssues, reorderSuggestions } from "@/server/demo/reorder-store";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { InventoryView } from "@/features/inventory/inventory-view";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Inventory" };

/**
 * Same pharmacy-counter view as admin, minus write-off — front desk receives
 * and adjusts stock day to day, but destroying stock value stays an admin call.
 */
export default async function ReceptionInventoryPage() {
  const session = await requireRole("RECEPTIONIST");
  const canEdit = can(session.user.role, "inventory", "edit");
  const canDelete = can(session.user.role, "inventory", "delete");

  const [medicines, stockMovements, batches, supplierRows, suggestions, dataQuality] = await Promise.all([
    db.medicines.list(),
    db.stockMovements.list(),
    db.medicineBatches.list(),
    getCachedMasters("suppliers"),
    reorderSuggestions(),
    dataQualityIssues(),
  ]);
  const supplierRowsActive = supplierRows.filter((s) => s.active);

  const lowStock = medicines.filter((m) => m.stockQty <= m.reorderLevel).length;

  const liveBatches = batches.filter((b) => b.quantity > 0);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const expiringSoon = liveBatches.filter((b) => b.expiry && b.expiry <= in30).length;

  const sellPriceOf = new Map(medicines.map((m) => [m.id, m.sellPrice]));
  const stockValueAtCost = liveBatches.reduce((s, b) => s + b.quantity * b.costPrice, 0);
  const stockValueAtRetail = liveBatches.reduce(
    (s, b) => s + b.quantity * (sellPriceOf.get(b.medicineId) ?? 0),
    0,
  );
  const marginPct =
    stockValueAtRetail > 0
      ? Math.round(((stockValueAtRetail - stockValueAtCost) / stockValueAtRetail) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Medicine stock, batches and alerts." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total items" value={medicines.length} icon={Package} accent="primary" />
        <StatCard label="Low stock" value={lowStock} icon={AlertTriangle} accent="warning" />
        <StatCard
          label="Batches expiring ≤30 days"
          value={expiringSoon}
          icon={CalendarClock}
          accent="destructive"
        />
        <StatCard
          label="Stock value (cost)"
          value={formatCurrency(stockValueAtCost)}
          icon={IndianRupee}
          accent="success"
          breakdown={[
            { label: "Retail", value: Math.round(stockValueAtRetail) },
            { label: "Margin %", value: marginPct },
          ]}
        />
      </div>
      <InventoryView
        medicines={medicines}
        movements={stockMovements}
        batches={batches}
        suggestions={suggestions}
        dataQuality={dataQuality.map(({ key, label, count, why }) => ({ key, label, count, why }))}
        suppliers={supplierRowsActive.map((s) => s.name)}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
