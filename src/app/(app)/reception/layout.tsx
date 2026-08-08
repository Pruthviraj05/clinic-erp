import { requireRole } from "@/lib/guard";

export default async function ReceptionLayout({ children }: { children: React.ReactNode }) {
  await requireRole("RECEPTIONIST");
  return <>{children}</>;
}
