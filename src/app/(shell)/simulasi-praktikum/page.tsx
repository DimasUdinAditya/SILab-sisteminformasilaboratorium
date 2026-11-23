"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageOff, Info, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSignedUrl } from "@/lib/media";
import { Link } from "@/lib/router-compat";
import { type CatalogSimulation, simulationCatalogQuery } from "@/lib/simulation-catalog";
import { cn } from "@/lib/utils";

const ALL = "Semua";

/** Katalog simulasi pusat untuk latihan mandiri. Mahasiswa hanya melihat dan memainkan simulasi aktif. */
export default function SimulasiPraktikumPage() {
  const { data, isLoading, isError } = useQuery(simulationCatalogQuery);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(ALL);

  const items = useMemo(() => (data ?? []).filter((c) => c.is_active), [data]);
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(items.map((c) => c.category).filter((x): x is string => !!x))).sort()],
    [items],
  );
  const term = q.trim().toLowerCase();
  const shown = items.filter(
    (c) =>
      (category === ALL || c.category === category) &&
      (!term || [c.title, c.category, c.description].some((v) => (v ?? "").toLowerCase().includes(term))),
  );

  return (
    <div>
      <PageHeader title="Simulasi Praktikum" description="Latihan mandiri dengan simulasi virtual, di luar penugasan modul." />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, kategori, atau deskripsi"
            className="pl-9"
            aria-label="Cari simulasi"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={c === category ? "default" : "outline"} aria-pressed={c === category} onClick={() => setCategory(c)}>
                {c}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat…</p>}
      {isError && <p className="py-8 text-center text-sm text-destructive">Katalog belum bisa dimuat. Coba muat ulang halaman.</p>}
      {data && items.length === 0 && (
        <p className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground shadow-card">Belum ada simulasi yang tersedia.</p>
      )}
      {data && items.length > 0 && shown.length === 0 && (
        <p className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground shadow-card">Tidak ada simulasi yang cocok dengan pencarian.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <SimulationCard key={c.id} sim={c} />
        ))}
      </div>
    </div>
  );
}

function Thumbnail({ path, alt, className }: { path: string | null | undefined; alt: string; className?: string }) {
  const { data: url } = useSignedUrl(path);
  return (
    <div className={cn("flex items-center justify-center bg-muted", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <ImageOff className="size-6" /> Tanpa thumbnail
        </span>
      )}
    </div>
  );
}

function SimulationCard({ sim: c }: { sim: CatalogSimulation }) {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <Thumbnail path={c.thumbnail?.file_url} alt={c.title} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {c.category && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary">{c.category}</span>}
          <span className="text-muted-foreground">{c.type === "video" ? "Video" : "Simulasi interaktif"}</span>
        </div>
        <p className="font-medium leading-snug">{c.title}</p>
        {c.description && <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="sm" aria-label={`Detail ${c.title}`} onClick={() => setDetailOpen(true)}>
            <Info /> Detail
          </Button>
          <Button size="sm" asChild>
            <Link to="/simulasi-praktikum/$id" params={{ id: c.id }} aria-label={`Mulai simulasi ${c.title}`}>
              <Play /> Mulai Simulasi
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>
              {c.category ?? "Tanpa kategori"} · {c.type === "video" ? "Video" : "Simulasi interaktif"}
            </DialogDescription>
          </DialogHeader>
          {c.thumbnail && <Thumbnail path={c.thumbnail.file_url} alt={c.title} className="max-h-60 w-full rounded-lg" />}
          {c.description ? (
            <p className="whitespace-pre-line text-sm">{c.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada deskripsi.</p>
          )}
          <Button asChild className="w-full">
            <Link to="/simulasi-praktikum/$id" params={{ id: c.id }}>
              <Play /> Mulai Simulasi
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  );
}
