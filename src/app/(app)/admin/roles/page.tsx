import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/guard";
import {
  MODULES,
  PERMISSIONS,
  PERMISSION_ACTIONS,
  ROLES,
  ROLE_LABELS,
  type PermissionAction,
} from "@/lib/rbac";
import { humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";

export const metadata: Metadata = { title: "Roles & Access" };

const ACTION_SHORT: Record<PermissionAction, string> = {
  view: "V",
  create: "C",
  edit: "E",
  delete: "D",
  export: "X",
  print: "P",
};

export default async function AdminRolesPage() {
  await requireRole("ADMIN");

  return (
    <div>
      <PageHeader
        title="Roles & Access"
        description="Per-module permissions enforced across pages, actions and navigation."
      />

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {PERMISSION_ACTIONS.map((a) => (
          <span key={a} className="inline-flex items-center gap-1.5">
            <span className="inline-flex size-5 items-center justify-center rounded border bg-muted/40 font-mono text-[10px] font-semibold">
              {ACTION_SHORT[a]}
            </span>
            {humanizeEnum(a)}
          </span>
        ))}
      </div>

      <SectionCard noPadding>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Module</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" /> {ROLE_LABELS[r]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap capitalize">{humanizeEnum(m)}</td>
                  {ROLES.map((r) => {
                    const actions = PERMISSIONS[r]?.[m] ?? [];
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {actions.length === 0 ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span className="inline-flex flex-wrap justify-center gap-1">
                            {PERMISSION_ACTIONS.filter((a) => actions.includes(a)).map((a) => (
                              <span
                                key={a}
                                title={humanizeEnum(a)}
                                className="inline-flex size-5 items-center justify-center rounded border bg-primary/10 font-mono text-[10px] font-semibold text-primary"
                              >
                                {ACTION_SHORT[a]}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
