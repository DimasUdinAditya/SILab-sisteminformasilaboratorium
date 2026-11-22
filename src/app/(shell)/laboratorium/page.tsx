"use client";

import { Link } from "@/lib/router-compat";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, FlaskConical, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { LabFormDialog } from "@/components/labman/lab-form-dialog";
import { Button } from "@/components/ui/button";
import { labsQuery } from "@/lib/labman-queries";
import { meQueryOptions } from "@/lib/profile";


export default function LabsPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: labs, isLoading } = useQuery(labsQuery);
  const [addOpen, setAddOpen] = useState(false);
  const isKalab = me?.role === "kalab";
  const rows = (labs ?? []).filter((l) => !isKalab || l.kalab_id === me?.id);

  return (
    <div>
      <PageHeader
        title={isKalab ? "Laboratorium Saya" : "Laboratorium"}
        description={
          isKalab
            ? "Kelola data dan jadwal laboratorium yang Anda pimpin."
            : "Lihat jadwal laboratorium dan ajukan penggunaan pada slot yang masih kosong."
        }
        actions={
          isKalab ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Tambah Laboratorium
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/laboratorium/pengajuan">
                <ClipboardList /> Pengajuan Saya
              </Link>
            </Button>
          )
        }
      />
      {isKalab && <LabFormDialog open={addOpen} onOpenChange={setAddOpen} lab={null} />}
      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {labs && rows.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          {isKalab ? "Anda belum ditugaskan sebagai kepala laboratorium. Hubungi Super Admin." : "Belum ada laboratorium terdaftar."}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((l) => (
          <Link
            key={l.id}
            to="/laboratorium/$id"
            params={{ id: l.id }}
            className="group flex flex-col rounded-xl border bg-card p-5 shadow-card transition hover:border-primary"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FlaskConical className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold">{l.name}</h2>
                <p className="text-xs text-muted-foreground">{l.program_studies?.name}</p>
              </div>
            </div>
            {l.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>}
            <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {l.location ?? "-"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" /> {l.capacity ?? "-"} orang
                </span>
              </span>
              <ChevronRight className="size-4 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
