import { FileText, Image as ImageIcon, Library, MapPin, MonitorPlay, Puzzle, Type } from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import { simulationDescription } from "@/components/vlab/editor/simulations-tab";
import { HotspotImage } from "@/components/vlab/hotspot-image";
import { EmbedView, MediaView } from "@/components/vlab/media-view";
import { RichText } from "@/components/vlab/rich-text";
import { isSafeHttpUrl, MATERIAL_TYPE_LABELS, parseReferences, type MaterialType } from "@/lib/vlab";
import type { StudentModuleData } from "@/lib/vlab-queries";

const ICON: Record<MaterialType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  diagram: ImageIcon,
  pdf: FileText,
  reference: Library,
  hotspot: MapPin,
};

export function MaterialsView({ module }: { module: StudentModuleData }) {
  if (!module.materials.length) return <p className="text-sm text-muted-foreground">Tidak ada materi pada modul ini.</p>;
  return (
    <div className="space-y-6">
      {module.materials.map((m, i) => {
        const Icon = ICON[m.type];
        return (
          <article key={m.id} className="rounded-xl border bg-card p-6 shadow-card">
            <header className="mb-4 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <div>
                <h3 className="font-semibold">
                  {i + 1}. {m.title}
                </h3>
                <StatusBadge label={MATERIAL_TYPE_LABELS[m.type]} tone="neutral" className="mt-1" />
              </div>
            </header>
            {m.type === "hotspot" ? (
              <div className="space-y-4">
                <RichText html={m.content} />
                <p className="text-xs text-muted-foreground">Klik titik bernomor pada gambar untuk melihat penjelasan.</p>
                <HotspotImage path={m.media_assets?.file_url} alt={m.title} spots={m.hotspots} />
                {m.hotspots.length > 0 && (
                  <ol className="grid gap-2 text-sm md:grid-cols-2">
                    {m.hotspots.map((h, n) => (
                      <li key={h.id} className="rounded-lg bg-muted/60 p-3">
                        <span className="font-semibold">
                          {n + 1}. {h.title}
                        </span>
                        {h.description && <p className="mt-1 whitespace-pre-line text-muted-foreground">{h.description}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : m.type === "reference" && parseReferences(m.content) ? (
              <ol className="space-y-3 text-sm">
                {parseReferences(m.content)?.map((r, n) => (
                  <li key={n} className="rounded-lg bg-muted/60 p-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.kind}</p>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-secondary hover:underline">
                      {r.url}
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="space-y-4">
                {m.media_assets && <MediaView asset={m.media_assets} alt={m.title} />}
                <RichText html={m.content} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function ProceduresView({ module }: { module: StudentModuleData }) {
  if (!module.procedures.length) return <p className="text-sm text-muted-foreground">Tidak ada prosedur pada modul ini.</p>;
  return (
    <ol className="relative ml-4 space-y-6 border-l-2 border-primary-soft pl-8">
      {module.procedures.map((p, i) => (
        <li key={p.id} className="relative">
          <span className="absolute -left-[3.1rem] flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {i + 1}
          </span>
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="mb-2 font-semibold">{p.title}</h3>
            <RichText html={p.instruction} className="text-sm" />
            {p.media_assets && (
              <div className="mt-4">
                <MediaView asset={p.media_assets} alt={p.title} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SimulationsView({ module }: { module: StudentModuleData }) {
  if (!module.simulations.length) return <p className="text-sm text-muted-foreground">Tidak ada simulasi pada modul ini.</p>;
  return (
    <div className="space-y-6">
      {module.simulations.map((s) => {
        const desc = simulationDescription(s.config);
        return (
          <article key={s.id} className="rounded-xl border bg-card p-6 shadow-card">
            <header className="mb-3 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {s.type === "video" ? <MonitorPlay className="size-4" /> : <Puzzle className="size-4" />}
              </span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <StatusBadge label={s.type === "video" ? "Video" : "Simulasi interaktif"} tone="neutral" className="mt-1" />
              </div>
            </header>
            {desc && <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground">{desc}</p>}
            {s.media_assets ? (
              <MediaView asset={s.media_assets} alt={s.title} />
            ) : s.external_url && isSafeHttpUrl(s.external_url) && s.display_mode === "new_tab" ? (
              <a
                href={s.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Buka simulasi di tab baru
              </a>
            ) : s.external_url ? (
              <EmbedView url={s.external_url} title={s.title} />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
