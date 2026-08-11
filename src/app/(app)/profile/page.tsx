import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getCachedDoctor } from "@/server/cache/reference-data";
import { ROLES } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/features/profile/profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const { user } = await requireRole(...ROLES);

  let phone: string | undefined;
  let qualifications: string | null | undefined;
  let registrationNo: string | null | undefined;

  if (user.role === "DOCTOR" && user.linkId) {
    const doctor = await getCachedDoctor(user.linkId);
    phone = doctor?.phone;
    qualifications = doctor?.qualifications;
    registrationNo = doctor?.registrationNo;
  } else if (user.role === "RECEPTIONIST" && user.linkId) {
    const receptionist = await db.receptionists.get(user.linkId);
    phone = receptionist?.phone;
  } else if (user.role === "PATIENT" && user.linkId) {
    const patient = await db.patients.get(user.linkId);
    phone = patient?.phone;
  }

  return (
    <div>
      <PageHeader title="My Profile" description="Your basic details." />
      <ProfileForm
        role={user.role}
        fullName={user.fullName}
        email={user.email}
        phone={phone}
        qualifications={qualifications}
        registrationNo={registrationNo}
      />
    </div>
  );
}
