import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { getRxDesignFor, RX_ACCENTS } from "@/server/demo/rx-design-store";
import { PageHeader } from "@/components/shared/page-header";
import { RxDesignForm } from "@/features/prescriptions/rx-design-form";

export const metadata: Metadata = { title: "Prescription design" };

export default async function DoctorRxDesignPage() {
  const { user } = await requireRole("DOCTOR");
  const design = await getRxDesignFor(user.linkId ?? user.id);

  return (
    <div>
      <PageHeader
        title="Prescription design"
        description="Your own header, footer, accent colour and print language."
      />
      <RxDesignForm design={design} accents={[...RX_ACCENTS]} />
    </div>
  );
}
