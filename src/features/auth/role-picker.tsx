"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Stethoscope, ClipboardList, User, ArrowRight, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInAs } from "@/server/actions/session.actions";
import type { Role } from "@/lib/rbac";

interface RoleOption {
  role: Role;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: "ADMIN", label: "Admin", description: "Full control over branches, staff, finance & settings", icon: ShieldCheck },
  { role: "DOCTOR", label: "Doctor", description: "Consultations, prescriptions & patient history", icon: Stethoscope },
  { role: "RECEPTIONIST", label: "Receptionist", description: "Registration, appointments, billing & queue", icon: ClipboardList },
  { role: "PATIENT", label: "Patient", description: "Appointments, prescriptions, records & bills", icon: User },
];

export function RolePicker() {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Role | null>(null);

  function choose(role: Role) {
    setSelected(role);
    startTransition(() => {
      void signInAs(role);
    });
  }

  return (
    <div className="grid gap-3">
      {ROLE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isLoading = pending && selected === opt.role;
        return (
          <button
            key={opt.role}
            type="button"
            disabled={pending}
            onClick={() => choose(opt.role)}
            className={cn(
              "group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all",
              "hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-60",
              selected === opt.role && "border-primary/60 ring-1 ring-primary/30",
            )}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{opt.label}</div>
              <div className="truncate text-sm text-muted-foreground">{opt.description}</div>
            </div>
            {isLoading ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
