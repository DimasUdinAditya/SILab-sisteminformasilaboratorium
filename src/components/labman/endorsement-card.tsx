"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import { formatDateTime } from "@/lib/labman";
import type { LetterKind } from "@/lib/letter-template";
import { endorsementStatusQuery } from "@/lib/letters-queries";

export function EndorsementBadge({ status }: { status: "Menunggu_Pengesahan" | "Disahkan" }) {
  return status === "Disahkan" ? <StatusBadge label="Disahkan" tone="success" /> : <StatusBadge label="Menunggu Pengesahan" tone="warning" />;
}

/** Read-only Dekan endorsement status shown to the requester and KaLab. */
export function EndorsementCard({ kind, id }: { kind: LetterKind; id: string }) {
  const { data, isLoading } = useQuery(endorsementStatusQuery(kind, id));
  if (isLoading || !data) return null;
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <FileSignature className="size-4 text-primary" /> Status Pengesahan
        </h3>
        <EndorsementBadge status={data.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {data.status === "Disahkan" && data.endorsed_at
          ? `Disahkan Dekan pada ${formatDateTime(data.endorsed_at)}.`
          : `Masuk antrean pengesahan Dekan sejak ${formatDateTime(data.created_at)}.`}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Pengesahan bersifat administratif dan tidak memengaruhi izin operasional dari KaLab.</p>
    </div>
  );
}
