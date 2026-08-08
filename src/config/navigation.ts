import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  UserCog,
  Building2,
  FileText,
  Receipt,
  Package,
  BarChart3,
  PieChart,
  CalendarRange,
  SlidersHorizontal,
  Bell,
  ShieldCheck,
  ScrollText,
  FolderHeart,
  FileSignature,
  Palette,
  ShieldPlus,
  CalendarOff,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/rbac";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Route prefix that each role's app section lives under. */
export const ROLE_BASE: Record<Role, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/reception",
  PATIENT: "/portal",
};

const ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: PieChart },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarRange },
    ],
  },
  {
    title: "Clinical",
    items: [
      { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
      { label: "Patients", href: "/admin/patients", icon: Users },
      { label: "Prescriptions", href: "/admin/prescriptions", icon: FileText },
      { label: "Consent Forms", href: "/admin/consent", icon: FileSignature },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Billing", href: "/admin/billing", icon: Receipt },
      { label: "Inventory", href: "/admin/inventory", icon: Package },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Branches", href: "/admin/branches", icon: Building2 },
      { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
      { label: "Receptionists", href: "/admin/receptionists", icon: UserCog },
      { label: "Leave & Roster", href: "/admin/leave", icon: CalendarOff },
      { label: "Insurance & TPA", href: "/admin/insurance", icon: ShieldPlus },
      { label: "Masters", href: "/admin/masters", icon: SlidersHorizontal },
      { label: "Administrators", href: "/admin/admins", icon: ShieldPlus },
      { label: "Roles & Access", href: "/admin/roles", icon: ShieldCheck },
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: SlidersHorizontal },
    ],
  },
];

const DOCTOR_NAV: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/doctor", icon: LayoutDashboard },
      { label: "Consult", href: "/doctor/consult", icon: Stethoscope },
      { label: "Appointments", href: "/doctor/appointments", icon: CalendarDays },
      { label: "My Patients", href: "/doctor/patients", icon: Users },
      { label: "Disease Lists", href: "/doctor/diseases", icon: FolderHeart },
      { label: "Prescriptions", href: "/doctor/prescriptions", icon: FileText },
      { label: "Rx Design", href: "/doctor/rx-design", icon: Palette },
      { label: "Consent Forms", href: "/doctor/consent", icon: FileSignature },
      { label: "Calendar", href: "/doctor/calendar", icon: CalendarRange },
      { label: "Roster & Leave", href: "/doctor/roster", icon: CalendarOff },
      { label: "Notifications", href: "/doctor/notifications", icon: Bell },
    ],
  },
];

const RECEPTION_NAV: NavSection[] = [
  {
    title: "Front Desk",
    items: [
      { label: "Dashboard", href: "/reception", icon: LayoutDashboard },
      { label: "Appointments", href: "/reception/appointments", icon: CalendarDays },
      { label: "Patients", href: "/reception/patients", icon: Users },
      { label: "Billing", href: "/reception/billing", icon: Receipt },
      { label: "Consent Forms", href: "/reception/consent", icon: FileSignature },
      { label: "Calendar", href: "/reception/calendar", icon: CalendarRange },
      { label: "Notifications", href: "/reception/notifications", icon: Bell },
    ],
  },
];

const PATIENT_NAV: NavSection[] = [
  {
    title: "My Health",
    items: [
      { label: "Overview", href: "/portal", icon: LayoutDashboard },
      { label: "Appointments", href: "/portal/appointments", icon: CalendarDays },
      { label: "Prescriptions", href: "/portal/prescriptions", icon: FileText },
      { label: "Medical Records", href: "/portal/records", icon: FolderHeart },
      { label: "Consent Forms", href: "/portal/consent", icon: FileSignature },
      { label: "Billing", href: "/portal/billing", icon: Receipt },
      { label: "Notifications", href: "/portal/notifications", icon: Bell },
    ],
  },
];

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  ADMIN: ADMIN_NAV,
  DOCTOR: DOCTOR_NAV,
  RECEPTIONIST: RECEPTION_NAV,
  PATIENT: PATIENT_NAV,
};

export function getNavForRole(role: Role): NavSection[] {
  return NAV_BY_ROLE[role] ?? [];
}
