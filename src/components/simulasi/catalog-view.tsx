"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MonitorPlay, RotateCw, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { type CatalogViewer, SimulationCard } from "@/components/simulasi/simulation-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { simulationCatalogQuery } from "@/lib/simulation-catalog";
import { cn } from "@/lib/utils";

const ALL = "Semua";

/** Katalog simulasi yang dipakai bersama oleh dosen dan mahasiswa. Hanya simulasi yang aktif yang ditampilkan. */
export function SimulationCatalogView({
  viewer,
  title,
  description,
  banner,
  emptyHint,
}: {
  viewer: CatalogViewer;
  title: string;
  description: string;
  banner?: ReactNode;
  emptyHint?: string;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery(simulationCatalogQuery);
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
      <PageHeader title={title} description={description} />
      {banner && <div className="mb-6">{banner}</div>}

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-[480px]">
          <label htmlFor="sim-search" className="sr-only">
            Cari simulasi
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="sim-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, kategori, atau deskripsi"
            className="h-11 rounded-[10px] pl-10"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
            {categories.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === category ? "default" : "outline"}
                aria-pressed={c === category}
                className="h-9 rounded-[10px]"
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(300px,420px))]" aria-label="Memuat simulasi" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="h-[200px] w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-11 w-full rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <AlertTriangle aria-hidden className="size-8 text-destructive" />
          <p className="font-medium text-foreground">Simulasi belum bisa dimuat.</p>
          <p className="text-sm text-muted-foreground">Periksa koneksi Anda, lalu coba lagi.</p>
          <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => refetch()} disabled={isFetching}>
            <RotateCw aria-hidden /> Coba lagi
          </Button>
        </div>
      )}

      {data && items.length === 0 && (
        <EmptyState
          title="Belum ada simulasi yang tersedia."
          hint={emptyHint}
        />
      )}

      {data && items.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          Tidak ada simulasi yang cocok dengan pencarian Anda.
        </p>
      )}

      {shown.length > 0 && (
        <div className={cn("grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(300px,420px))]")}>
          {shown.map((c) => (
            <SimulationCard key={c.id} sim={c} viewer={viewer} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <MonitorPlay aria-hidden className="size-7" strokeWidth={1.8} />
      </span>
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-md text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
