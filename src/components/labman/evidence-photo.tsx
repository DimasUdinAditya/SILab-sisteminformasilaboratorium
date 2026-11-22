"use client";

import { ExternalLink, FileText, Loader2 } from "lucide-react";

import { formatDateTime } from "@/lib/labman";
import { useLabFileUrl, type LabBucket } from "@/lib/lab-files";

/** A private photo/document with who uploaded it and when. */
export function EvidencePhoto({
  bucket,
  path,
  title,
  uploader,
  uploadedAt,
  note,
}: {
  bucket: LabBucket;
  path: string;
  title: string;
  uploader?: string | null | undefined;
  uploadedAt?: string | null | undefined;
  note?: string | null | undefined;
}) {
  const { data: url, isLoading, isError } = useLabFileUrl(bucket, path);
  const isPdf = path.toLowerCase().endsWith(".pdf");
  return (
    <figure className="overflow-hidden rounded-lg border bg-card">
      <div className="bg-muted">
        {isLoading && (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Memuat…
          </div>
        )}
        {isError && <p className="p-4 text-sm text-destructive">File tidak dapat dimuat.</p>}
        {url && !isPdf && (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={title} className="max-h-72 w-full object-contain" />
          </a>
        )}
        {url && isPdf && (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-4 text-sm font-medium text-secondary hover:underline">
            <FileText className="size-4" /> Buka PDF <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <figcaption className="space-y-1 p-3 text-xs text-muted-foreground">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p>
          Diunggah oleh {uploader ?? "-"} · {formatDateTime(uploadedAt)}
        </p>
        {note && <p className="text-sm text-foreground">{note}</p>}
      </figcaption>
    </figure>
  );
}
