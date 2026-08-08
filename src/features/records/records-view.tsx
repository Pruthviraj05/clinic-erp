"use client";

import { FolderHeart, Upload, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import type { MedicalRecordItem } from "@/server/demo/extra";

export function RecordsView({ records }: { records: MedicalRecordItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => toast.success("Upload record (demo)")}>
          <Upload className="size-4" /> Upload record
        </Button>
      </div>
      {records.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Download"
                  onClick={() => toast.success(`Downloading ${r.title} (demo)`)}
                >
                  <Download className="size-4" />
                </Button>
              </div>
              <p className="mt-3 font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.category} · {r.fileType} · {r.fileSize}</p>
              <p className="mt-2 text-[11px] text-muted-foreground/70">{formatDate(r.recordedAt)}</p>
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
