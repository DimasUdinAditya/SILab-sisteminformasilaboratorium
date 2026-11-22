import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Spot = { id: string; pos_x: number; pos_y: number; title: string; description: string | null };

/** Image with numbered points. With onPick, clicking the image reports a position in percent. */
export function HotspotImage({
  path,
  alt,
  spots,
  onPick,
  onSelect,
  selectedId,
}: {
  path: string | null | undefined;
  alt: string;
  spots: Spot[];
  onPick?: (x: number, y: number) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const { data: url } = useSignedUrl(path);
  const [open, setOpen] = useState<string | null>(null);
  if (!path) return <p className="text-sm text-muted-foreground">Unggah gambar terlebih dahulu.</p>;
  if (!url) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  return (
    <div className="relative inline-block w-full overflow-hidden rounded-lg border bg-muted">
      <img
        src={url}
        alt={alt}
        className={cn("block w-full select-none", onPick && "cursor-crosshair")}
        draggable={false}
        onClick={(e) => {
          if (!onPick) return;
          const r = e.currentTarget.getBoundingClientRect();
          const x = Math.round(((e.clientX - r.left) / r.width) * 10000) / 100;
          const y = Math.round(((e.clientY - r.top) / r.height) * 10000) / 100;
          onPick(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
        }}
      />
      {spots.map((s, i) =>
        onSelect ? (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-label={`Titik ${i + 1}: ${s.title}`}
            className={cn(
              "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground shadow-elevated",
              selectedId === s.id && "ring-4 ring-secondary/50",
            )}
            style={{ left: `${s.pos_x}%`, top: `${s.pos_y}%` }}
          >
            {i + 1}
          </button>
        ) : (
          <Popover key={s.id} open={open === s.id} onOpenChange={(o) => setOpen(o ? s.id : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Titik ${i + 1}: ${s.title}`}
                className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground shadow-elevated hover:animate-none"
                style={{ left: `${s.pos_x}%`, top: `${s.pos_y}%` }}
              >
                {i + 1}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <p className="font-semibold">{s.title}</p>
              {s.description && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{s.description}</p>}
            </PopoverContent>
          </Popover>
        ),
      )}
    </div>
  );
}
