import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getPatientBundle } from "@/server/services/patients.service";
import { PatientProfile } from "@/features/patients/patient-profile";
import { generateQrDataUrl } from "@/lib/qr";

export const metadata: Metadata = { title: "Patient" };

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const bundle = await getPatientBundle(id);
  if (!bundle) notFound();
  const qrDataUrl = await generateQrDataUrl(`clinicore:patient:${bundle.patient.mrn}`);

  return (
    <div className="space-y-4">
      <Link href="/admin/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to patients
      </Link>
      <PatientProfile bundle={bundle} qrDataUrl={qrDataUrl} />
    </div>
  );
}
