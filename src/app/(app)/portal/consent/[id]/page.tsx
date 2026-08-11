import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { ConsentDetail } from "@/features/consent/consent-detail";
import { consentInfoFor } from "@/features/consent/consent-info";
import { generateQrDataUrl } from "@/lib/qr";

export const metadata: Metadata = { title: "Consent Form" };

export default async function PortalConsentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole("PATIENT");
  const { id } = await params;
  const form = await db.consentForms.get(id);
  // Scoped read: a patient may only open their own forms.
  if (!form || form.patientId !== user.linkId) notFound();

  const { clinic, doctorMeta, patient, accentColor } = await consentInfoFor(form);
  const qrDataUrl = await generateQrDataUrl(`https://clinicore.app/verify/consent/${form.id}`);

  return (
    <div className="space-y-4">
      <Link href="/portal/consent" className="print-hide inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to consent forms
      </Link>
      <ConsentDetail form={form} clinic={clinic} doctorMeta={doctorMeta} patient={patient} qrDataUrl={qrDataUrl} accentColor={accentColor} />
    </div>
  );
}
