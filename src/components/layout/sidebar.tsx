"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavForRole } from "@/config/navigation";
import { appConfig } from "@/config/app.config";
import type { Role } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";
import { initials } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SignOutButton } from "./sign-out-button";

/** Active state: exact match for section roots, prefix otherwise. */
function isActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  const isRoot = href.split("/").filter(Boolean).length === 1;
  if (isRoot) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  role,
  collapsed = false,
  onToggle,
  userName,
  userEmail,
}: {
  role: Role;
  collapsed?: boolean;
  onToggle?: () => void;
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const sections = getNavForRole(role);

  return (
    <div className="flex h-full flex-col">
      {/* Brand + collapse toggle */}
      <div className={cn("flex h-16 items-center border-b px-3", collapsed ? "justify-center" : "gap-2 px-5")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-4.5" />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{appConfig.name}</span>
            <span className="text-[11px] text-muted-foreground">{ROLE_LABELS[role]}</span>
          </div>
        )}
        {onToggle && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="ml-auto hidden rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:block"
          >
            <PanelLeftClose className="size-4.5" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {onToggle && collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mt-2 hidden rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:block"
        >
          <PanelLeftOpen className="size-4.5" />
        </button>
      )}

      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        <nav className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4.5 shrink-0", active && "text-primary")} />
                    {!collapsed && item.label}
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={link} />
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer: user + sign out (always visible) */}
      <div className="border-t p-3">
        {!collapsed && userName && (
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(userName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{userName}</p>
              {userEmail && <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>}
            </div>
          </div>
        )}
        <SignOutButton collapsed={collapsed} />
      </div>
    </div>
  );
}
