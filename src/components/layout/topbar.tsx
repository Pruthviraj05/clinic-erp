"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, UserRound, PanelLeft } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { SearchTrigger } from "./search-trigger";
import { signOut } from "@/server/actions/session.actions";
import { initials } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { ROLE_BASE } from "@/config/navigation";

interface TopbarProps {
  name: string;
  email: string;
  role: Role;
  branchName?: string;
  notificationCount?: number;
  onToggleSidebar?: () => void;
}

export function Topbar({ name, email, role, branchName, notificationCount = 0, onToggleSidebar }: TopbarProps) {
  const [pending, startTransition] = useTransition();
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // The app shell persists across navigations, so the drawer must close
  // itself when a nav link changes the route.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      {/* Mobile nav */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger
          aria-label="Open menu"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav role={role} userName={name} userEmail={email} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar toggle */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden lg:inline-flex")}
        >
          <PanelLeft className="size-5" />
        </button>
      )}

      {/* Search: full bar on desktop, icon-only trigger on mobile (both open the same palette).
          The palette UI itself (cmdk) is code-split — see SearchTrigger. */}
      <div className="flex flex-1 items-center md:max-w-md">
        <SearchTrigger />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {branchName ? (
          <Badge variant="secondary" className="mr-1 hidden font-normal sm:inline-flex">
            {branchName}
          </Badge>
        ) : null}

        <ThemeToggle />

        <Link
          href={`${ROLE_BASE[role]}/notifications`}
          aria-label="Notifications"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
        >
          <Bell className="size-4.5" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "h-auto gap-2 py-1 pl-1.5 pr-2")}>
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-sm font-medium">{name}</div>
                <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[role]}</div>
              </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="font-medium">{name}</div>
                <div className="text-xs font-normal text-muted-foreground">{email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound className="size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                startTransition(() => {
                  void signOut();
                });
              }}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
