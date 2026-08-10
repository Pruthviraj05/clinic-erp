import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getPrescription } from "@/server/services/prescriptions.service";
import { PrescriptionDetail } from "@/features/prescriptions/prescription-detail";
import { clinicInfoFor } from "@/features/prescriptions/clinic-info";
import { generateQrDataUrl } from "@/lib/qr";

export const metadata: Metadata = { title: "Prescription" };

export default async function DoctorPrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole("DOCTOR");
  const { id } = await params;
  // Scoped read: a doctor may only open their own prescriptions.
  const rx = await getPrescription(id, user);
  if (!rx) notFound();
  const { clinic, doctorMeta, patient, design } = await clinicInfoFor(rx);
  const qrDataUrl = await generateQrDataUrl(`https://clinicore.app/verify/rx/${rx.id}`);
  return (
    <div className="space-y-4">
      <Link href="/doctor/prescriptions" className="print-hide inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to prescriptions
      </Link>
      <PrescriptionDetail
        prescription={rx}
        clinic={clinic}
        doctorMeta={doctorMeta}
        patient={patient}
        qrDataUrl={qrDataUrl}
        headerNote={design.headerNote}
        footerNote={design.footerNote}
        showQr={design.showQr}
        showVitals={design.showVitals}
        accentColor={design.accentColor}
        language={design.language}
        editHref={`/doctor/prescriptions/${rx.id}/edit`}
      />
    </div>
  );
}
