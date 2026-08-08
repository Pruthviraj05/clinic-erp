import type { Metadata } from "next";
import { Package, AlertTriangle, CalendarClock, IndianRupee } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { medicines } from "@/server/demo/data";
import { stockMovements } from "@/server/demo/inventory-store";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { InventoryView } from "@/features/inventory/inventory-view";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  const session = await requireRole("ADMIN");
  const canEdit = can(session.user.role, "inventory", "edit");
  const canDelete = can(session.user.role, "inventory", "delete");

  const lowStock = medicines.filter((m) => m.stockQty <= m.reorderLevel).length;
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const expiringSoon = medicines.filter((m) => m.nearestExpiry && m.nearestExpiry <= in30).length;
  const stockValue = medicines.reduce((s, m) => s + m.stockQty * m.sellPrice, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Medicine stock, batches and alerts." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total items" value={medicines.length} icon={Package} accent="primary" />
        <StatCard label="Low stock" value={lowStock} icon={AlertTriangle} accent="warning" />
        <StatCard label="Expiring ≤30 days" value={expiringSoon} icon={CalendarClock} accent="destructive" />
        <StatCard label="Stock value" value={formatCurrency(stockValue)} icon={IndianRupee} accent="success" />
      </div>
      <InventoryView medicines={medicines} movements={stockMovements} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
