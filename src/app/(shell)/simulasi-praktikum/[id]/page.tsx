"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmbedView } from "@/components/vlab/media-view";
import { Button } from "@/components/ui/button";
import { simulationCatalogQuery } from "@/lib/simulation-catalog";
import { isSafeHttpUrl, toEmbedUrl } from "@/lib/vlab";
import { Link, useParams } from "@/lib/router-compat";

/** Memainkan satu simulasi katalog langsung di dalam halaman LabVir. */
export default function MulaiSimulasiPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery(simulationCatalogQuery);
  const sim = data?.find((c) => c.id === id && c.is_active);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!sim)
    return (
      <div>
        <PageHeader title="Simulasi tidak tersedia" description="Simulasi ini tidak ada atau sudah dinonaktifkan." />
        <Button asChild variant="outline">
          <Link to="/simulasi-praktikum">
            <ArrowLeft /> Simulasi Praktikum
          </Link>
        </Button>
      </div>
    );

  const src = toEmbedUrl(sim.external_url);
  const safe = isSafeHttpUrl(src);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/simulasi-praktikum">
          <ArrowLeft /> Simulasi Praktikum
        </Link>
      </Button>
      <PageHeader title={sim.title} description={sim.category ?? (sim.type === "video" ? "Video" : "Simulasi interaktif")} />
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
        {safe ? (
          <EmbedView url={src} title={sim.title} />
        ) : (
          <p className="text-sm text-destructive">Tautan simulasi tidak valid. Hubungi Super Admin.</p>
        )}
        {sim.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{sim.description}</p>}
        {safe && (
          <Button asChild variant="outline" size="sm">
            <a href={sim.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Buka di tab baru
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
