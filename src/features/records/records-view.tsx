"use client";

import { FolderHeart, Download, FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import { AddMedicalRecordDialog } from "./medical-record-dialog";
import type { MedicalRecordItem } from "@/server/demo/extra";

export function RecordsView({ records, patientId }: { records: MedicalRecordItem[]; patientId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddMedicalRecordDialog patientId={patientId} triggerLabel="Add record" />
      </div>
      {records.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                {r.fileDataUrl ? (
                  <a
                    href={r.fileDataUrl}
                    download={r.title}
                    aria-label="Download"
                    className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="size-4" />
                  </a>
                ) : null}
              </div>
              <p className="mt-3 font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.category} · {r.fileType} · {r.fileSize}</p>
              {r.notes ? <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p> : null}
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                {formatDate(r.recordedAt)}{r.addedBy ? ` · Added by ${r.addedBy}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border">
          <EmptyState icon={FolderHeart} title="No records yet" description="Upload lab reports, scans and documents." />
        </div>
      )}
    </div>
  );
}
