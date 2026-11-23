"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  formatDate,
  formatScore,
  learningStatus,
  parseCompleted,
  parseSelfEvalItems,
  parseSteps,
  parseStepRules,
  resumeStep,
  stepLock,
  STEP_LABELS,
  type StepKey,
} from "@/lib/vlab";
import { studentModuleQuery, type StudentModuleData } from "@/lib/vlab-queries";


function stepInfo(m: StudentModuleData, s: StepKey): string {
  switch (s) {
    case "materi":
      return `${m.materials.length} materi`;
    case "prosedur":
      return `${m.procedures.length} langkah`;
    case "simulasi":
      return `${m.simulations.length} simulasi`;
    case "self_evaluation":
      return m.self_evaluations ? `${parseSelfEvalItems(m.self_evaluations.items).length} pernyataan` : "—";
    default: {
      const a = m.assessments.find((x) => x.type === s);
      if (!a) return "—";
      return [
        `${a.questions[0]?.count ?? 0} soal`,
        a.duration_min ? `${a.duration_min} menit` : "tanpa batas waktu",
        a.max_attempt ? `maks. ${a.max_attempt}× percobaan` : null,
        a.passing_grade != null ? `nilai lulus ${formatScore(a.passing_grade)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
  }
}

export default function ModuleDetailPage() {
  const { id } = useParams();
  const { data: m, isLoading } = useQuery(studentModuleQuery(id));
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!m)
    return (
      <div>
        <PageHeader title="Modul tidak tersedia" description="Modul ini belum dipublikasikan atau Anda tidak punya akses." />
        <Button asChild variant="outline">
          <Link to="/modul-praktikum">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
      </div>
    );

  const p = m.learning_progress[0];
  const steps = parseSteps(m.step_order);
  const done = parseCompleted(p?.completed_steps);
  const st = learningStatus(p);
  const rules = parseStepRules(m.step_rules);
  const step = resumeStep(steps, done, p?.current_step, rules);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/modul-praktikum">
          <ArrowLeft /> Modul Praktikum
        </Link>
      </Button>
      <PageHeader title={m.title} description={`${m.courses?.code} · ${m.courses?.name} · Dipublikasikan ${formatDate(m.published_at)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {m.description && (
            <section className="rounded-xl border bg-card p-6 shadow-card">
              <h2 className="mb-2 text-base font-semibold">Tentang modul</h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{m.description}</p>
            </section>
          )}
          <section className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold">Tahapan belajar</h2>
            <ol className="space-y-3">
              {[...steps, "ringkasan" as const].map((s, i) => {
                const isDone = s === "ringkasan" ? st.label === "Selesai" : done.includes(s);
                const lock = isDone ? null : stepLock(steps, done, rules, s);
                return (
                  <li key={s} className="flex items-start gap-3">
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 size-5 text-success" aria-label="Selesai" />
                    ) : (
                      <Circle className="mt-0.5 size-5 text-muted-foreground" aria-label="Belum selesai" />
                    )}
                    <div>
                      <p className="font-medium">
                        {i + 1}. {STEP_LABELS[s]}
                      </p>
                      <p className="text-xs text-muted-foreground">{s === "ringkasan" ? "Rangkuman hasil belajar Anda" : stepInfo(m, s)}</p>
                      {!isDone &&
                        (lock ? (
                          <p className="mt-1 text-xs text-warning">Terkunci. {lock}</p>
                        ) : (
                          <p className="mt-1 text-xs text-success">Terbuka</p>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        <aside className="h-fit rounded-xl border bg-card p-6 shadow-card lg:sticky lg:top-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Progres Anda</h2>
            <StatusBadge {...st} />
          </div>
          <p className="font-display text-4xl font-bold">{Math.round(Number(p?.percent ?? 0))}%</p>
          <Progress value={Number(p?.percent ?? 0)} className="mt-3 h-2" aria-label="Progres belajar" />
          <p className="mt-3 text-xs text-muted-foreground">
            {p ? `Terakhir dibuka ${formatDate(p.last_accessed_at, true)}` : "Anda belum mulai mempelajari modul ini."}
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/modul-praktikum/$id/belajar" params={{ id }} search={{ step }}>
              {!p ? "Mulai Belajar" : st.label === "Selesai" ? "Lihat Ringkasan" : `Lanjutkan Belajar · ${STEP_LABELS[step]}`}
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
