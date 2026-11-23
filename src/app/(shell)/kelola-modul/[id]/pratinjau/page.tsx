"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { MaterialsView, ProceduresView, SimulationsView } from "@/components/vlab/learn/content-views";
import { Button } from "@/components/ui/button";
import { MODULE_STATUS_META } from "@/lib/vlab";
import { moduleEditorQuery } from "@/lib/vlab-queries";
import type { StudentModuleData } from "@/lib/vlab-queries";

/**
 * Pratinjau untuk dosen pemilik modul: tampilan materi, prosedur, dan simulasi seperti yang dilihat mahasiswa.
 * Read-only; tidak mencatat progres dan tidak memerlukan akses mahasiswa.
 */
export default function ModulePreviewPage() {
  const { id } = useParams();
  const { data: module, isLoading } = useQuery(moduleEditorQuery(id));

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!module)
    return (
      <div>
        <PageHeader title="Modul tidak ditemukan" description="Modul ini tidak ada atau bukan milik mata kuliah Anda." />
        <Button asChild variant="outline">
          <Link to="/kelola-modul">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
      </div>
    );

  // Tampilan konten mahasiswa hanya membaca materi, prosedur, dan simulasi; bentuk datanya sama.
  const view = module as unknown as StudentModuleData;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/kelola-modul/$id" params={{ id }}>
          <ArrowLeft /> Kembali ke editor
        </Link>
      </Button>
      <PageHeader
        title={`Pratinjau: ${module.title}`}
        description={`${module.courses?.code ?? ""} · Tampilan ini sama dengan yang dilihat mahasiswa, tanpa mencatat progres.`}
      />
      <div className="mb-6">
        <StatusBadge {...MODULE_STATUS_META[module.status]} />
      </div>
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Materi</h2>
          <MaterialsView module={view} />
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Prosedur</h2>
          <ProceduresView module={view} />
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Simulasi</h2>
          <SimulationsView module={view} />
        </section>
      </div>
    </div>
  );
}
