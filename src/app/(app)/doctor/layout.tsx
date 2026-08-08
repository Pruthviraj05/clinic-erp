import { requireRole } from "@/lib/guard";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  await requireRole("DOCTOR");
  return <>{children}</>;
}
