"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { learningStatus, parseCompleted, parseSteps, resumeStep } from "@/lib/vlab";
import { studentModulesQuery } from "@/lib/vlab-queries";


export default function CatalogPage() {
  const { data: modules, isLoading } = useQuery(studentModulesQuery);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = (modules ?? []).filter((m) => {
    const st = learningStatus(m.learning_progress[0]).label;
    const s = q.trim().toLowerCase();
    return (
      (filter === "all" || st === filter) &&
      (!s || m.title.toLowerCase().includes(s) || (m.courses?.name ?? "").toLowerCase().includes(s) || (m.courses?.code ?? "").toLowerCase().includes(s))
    );
  });

  return (
    <div>
      <PageHeader title="Modul Praktikum" description="Modul praktikum virtual dari mata kuliah Anda." />
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari modul atau mata kuliah" className="pl-9" aria-label="Cari modul" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44" aria-label="Filter status belajar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="Belum mulai">Belum mulai</SelectItem>
            <SelectItem value="Sedang belajar">Sedang belajar</SelectItem>
            <SelectItem value="Selesai">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {modules && modules.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <BookOpen className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Belum ada modul untuk Anda</p>
          <p className="mt-1 text-sm text-muted-foreground">Modul akan tampil di sini setelah dosen mempublikasikannya.</p>
        </div>
      )}
      {modules && modules.length > 0 && rows.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada modul yang cocok.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((m) => {
          const p = m.learning_progress[0];
          const st = learningStatus(p);
          const pct = Number(p?.percent ?? 0);
          const step = resumeStep(parseSteps(m.step_order), parseCompleted(p?.completed_steps), p?.current_step);
          return (
            <div key={m.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-card">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {m.courses?.code} · {m.courses?.name}
                </p>
                <StatusBadge {...st} />
              </div>
              <Link to="/modul-praktikum/$id" params={{ id: m.id }} className="text-base font-semibold hover:text-secondary">
                {m.title}
              </Link>
              {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
              <div className="mt-auto pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Progress value={pct} className="h-2" aria-label="Progres belajar" />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
                </div>
                {p ? (
                  <Button asChild className="w-full" variant={st.label === "Selesai" ? "outline" : "default"}>
                    <Link to="/modul-praktikum/$id/belajar" params={{ id: m.id }} search={{ step }}>
                      {st.label === "Selesai" ? "Lihat Ringkasan" : "Lanjutkan Belajar"}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/modul-praktikum/$id" params={{ id: m.id }}>
                      Mulai Belajar
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
