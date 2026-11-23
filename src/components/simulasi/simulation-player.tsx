"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import type { CatalogViewer } from "@/components/simulasi/simulation-card";
import { EmbedView } from "@/components/vlab/media-view";
import { Button } from "@/components/ui/button";
import { meQueryOptions } from "@/lib/profile";
import { Link, useParams } from "@/lib/router-compat";
import { simulationCatalogQuery } from "@/lib/simulation-catalog";
import { isSafeHttpUrl, toEmbedUrl } from "@/lib/vlab";

/**
 * Memainkan satu simulasi langsung di halaman. Mode dosen adalah pratinjau: read-only dan tidak mencatat apa pun.
 */
export function SimulationPlayer({ viewer }: { viewer: CatalogViewer }) {
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useQuery(simulationCatalogQuery);
  const sim = data?.find((c) => c.id === id && c.is_active);
  const backHref = viewer === "dosen" ? "/katalog-simulasi" : "/simulasi-praktikum";
  const backLabel = viewer === "dosen" ? "Katalog Simulasi" : "Simulasi Virtual";

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (isError)
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Simulasi belum bisa dimuat.</p>
        <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  if (!sim)
    return (
      <div>
        <PageHeader title="Simulasi tidak tersedia" description="Simulasi ini tidak ada atau sudah dinonaktifkan." />
        <Button asChild variant="outline" className="h-11 rounded-[10px]">
          <Link to={backHref}>
            <ArrowLeft aria-hidden /> {backLabel}
          </Link>
        </Button>
      </div>
    );

  const src = toEmbedUrl(sim.external_url);
  const safe = isSafeHttpUrl(src);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-9">
        <Link to={backHref}>
          <ArrowLeft aria-hidden /> {backLabel}
        </Link>
      </Button>
      <PageHeader title={sim.title} description={sim.category ?? (sim.type === "video" ? "Video" : "Simulasi interaktif")} />

      {viewer === "dosen" && (
        <p role="note" className="mb-4 flex items-center gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          <Eye aria-hidden className="size-4 shrink-0" /> Mode pratinjau: tampilan hanya-baca. Tidak ada hasil atau progres yang disimpan.
        </p>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        {safe ? (
          <EmbedView url={src} title={sim.title} />
        ) : (
          <p className="text-sm text-destructive">Tautan simulasi tidak valid. Hubungi admin.</p>
        )}
        {sim.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{sim.description}</p>}
        {safe && (
          <Button asChild variant="outline" size="sm" className="h-9 rounded-[10px]">
            <a href={sim.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Buka di tab baru
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Halaman khusus satu role. Role lain melihat pesan, bukan konten. */
export function RoleGate({ allowed, label, children }: { allowed: string; label: string; children: React.ReactNode }) {
  const { data: me, isLoading } = useQuery(meQueryOptions);
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!me || me.role !== allowed)
    return <p className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">Halaman ini khusus {label}.</p>;
  return <>{children}</>;
}
