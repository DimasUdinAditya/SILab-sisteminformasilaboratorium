"use client";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/labman";

type Entry = { id: string; from_status: string | null; to_status: string; note: string | null; changed_at: string; profiles: { name: string } | null };

const DOT: Record<string, string> = {
  Ditolak: "bg-destructive",
  Dikonfirmasi: "bg-success",
  Disetujui: "bg-success",
  Ditunggu: "bg-warning",
  Dipinjam: "bg-warning",
};

/** Status history, oldest first, with who changed it and when. */
export function StatusTimeline({ entries }: { entries: Entry[] | null | undefined }) {
  const rows = [...(entries ?? [])].sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  if (!rows.length) return <p className="text-sm text-muted-foreground">Belum ada riwayat status.</p>;
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {rows.map((e, i) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-card",
              DOT[e.to_status] ?? "bg-primary",
              i === rows.length - 1 && "size-3.5",
            )}
          />
          <p className="text-sm font-semibold">{e.to_status}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(e.changed_at)}
            {e.profiles?.name ? ` · oleh ${e.profiles.name}` : ""}
          </p>
          {e.note && <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
