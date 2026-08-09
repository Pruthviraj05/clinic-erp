import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { appConfig } from "@/config/app.config";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { AdminUsersView } from "@/features/staff/admin-users-view";

export const metadata: Metadata = { title: "Administrators" };

export default async function AdminAccountsPage() {
  const { user } = await requireRole("ADMIN");
  const users = await db.users.list();

  return (
    <div>
      <PageHeader
        title="Administrators & accounts"
        description="Create administrators and manage sign-in accounts for every role."
      />
      {appConfig.authMode === "demo" ? (
        <p className="mb-4 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Password sign-in is <strong>prepared but switched off</strong> — the login screen still uses the role
          switcher. Accounts created here store a hashed password and become active the moment
          <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-xs">NEXT_PUBLIC_AUTH_MODE=credentials</code>
          is set. No other code changes are needed.
        </p>
      ) : null}
      <AdminUsersView
        accounts={users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
        }))}
        canManage={can(user.role, "roles", "edit")}
      />
    </div>
  );
}
