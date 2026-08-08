"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar";
import { Topbar } from "./topbar";
import type { Role } from "@/lib/rbac";

/**
 * Client shell: owns the sidebar collapse state (persisted to a cookie so the
 * server can render the correct width on first paint — no layout flash).
 */
export function AppShellClient({
  role,
  name,
  email,
  branchName,
  unread,
  initialCollapsed,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  branchName?: string;
  unread: number;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `cc_sidebar=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh w-full">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "lg:w-[68px]" : "lg:w-64",
        )}
      >
        <SidebarNav role={role} collapsed={collapsed} onToggle={toggle} userName={name} userEmail={email} />
      </aside>

      <div
        className={cn(
          "flex min-h-dvh w-full flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[68px]" : "lg:pl-64",
        )}
      >
        <Topbar
          name={name}
          email={email}
          role={role}
          branchName={branchName}
          notificationCount={unread}
          onToggleSidebar={toggle}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
