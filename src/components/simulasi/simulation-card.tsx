"use client";

import { Eye, Info, MonitorPlay, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSignedUrl } from "@/lib/media";
import { Link } from "@/lib/router-compat";
import type { CatalogSimulation } from "@/lib/simulation-catalog";
import { cn } from "@/lib/utils";

export type CatalogViewer = "dosen" | "mahasiswa";

/** Thumbnail yang diunggah admin. Jika kosong atau gagal dimuat, tampil placeholder gradien, bukan gambar rusak. */
export function SimulationThumbnail({ path, alt, className }: { path: string | null | undefined; alt: string; className?: string }) {
  const { data: url, isError } = useSignedUrl(path);
  const [broken, setBroken] = useState(false);
  const showImage = !!url && !isError && !broken;
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary/40", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <MonitorPlay aria-hidden className="size-14 text-primary-foreground/90" strokeWidth={1.8} />
      )}
    </div>
  );
}

/** Kartu simulasi yang sama untuk katalog dosen (pratinjau) dan simulasi mahasiswa (detail dan mulai). */
export function SimulationCard({ sim, viewer }: { sim: CatalogSimulation; viewer: CatalogViewer }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const kategori = sim.category ?? (sim.type === "video" ? "Video" : "Simulasi interaktif");
  const playHref = viewer === "dosen" ? "/katalog-simulasi/$id" : "/simulasi-praktikum/$id";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SimulationThumbnail path={sim.thumbnail?.file_url} alt={sim.title} className="h-[200px] rounded-t-2xl" />
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <p className="text-sm text-muted-foreground">{kategori}</p>
        <h3 className="text-lg font-semibold leading-snug text-foreground">{sim.title}</h3>
        <div className="mt-auto grid gap-3 pt-4">
          {viewer === "dosen" ? (
            <Button asChild className="h-11 w-full rounded-[10px]">
              <Link to={playHref} params={{ id: sim.id }} aria-label={`Preview simulasi ${sim.title}`}>
                <Eye aria-hidden /> Preview Simulasi
              </Link>
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11 rounded-[10px]" aria-label={`Detail ${sim.title}`} onClick={() => setDetailOpen(true)}>
                <Info aria-hidden /> Detail
              </Button>
              <Button asChild className="h-11 rounded-[10px]">
                <Link to={playHref} params={{ id: sim.id }} aria-label={`Mulai simulasi ${sim.title}`}>
                  <Play aria-hidden /> Mulai Simulasi
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {viewer === "mahasiswa" && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{sim.title}</DialogTitle>
              <DialogDescription>{kategori}</DialogDescription>
            </DialogHeader>
            {sim.thumbnail && <SimulationThumbnail path={sim.thumbnail.file_url} alt={sim.title} className="h-48 w-full rounded-lg" />}
            <p className="whitespace-pre-line text-sm text-foreground">{sim.description || "Belum ada deskripsi."}</p>
            <Button asChild className="h-11 w-full rounded-[10px]">
              <Link to="/simulasi-praktikum/$id" params={{ id: sim.id }}>
                <Play aria-hidden /> Mulai Simulasi
              </Link>
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
