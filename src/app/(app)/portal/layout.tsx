import { requireRole } from "@/lib/guard";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole("PATIENT");
  return <>{children}</>;
}
