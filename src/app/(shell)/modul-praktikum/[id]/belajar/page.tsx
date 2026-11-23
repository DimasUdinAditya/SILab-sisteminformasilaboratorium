"use client";

import { useParams, useSearch } from "@/lib/router-compat";
import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2, Lock, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { AssessmentStep } from "@/components/vlab/learn/assessment-step";
import { MaterialsView, ProceduresView, SimulationsView } from "@/components/vlab/learn/content-views";
import { SelfEvalStep } from "@/components/vlab/learn/self-eval-step";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import {
  bestScore,
  canOpenStep,
  errorMessage,
  formatDate,
  formatScore,
  LIKERT_LABELS,
  learningStatus,
  nextStep,
  parseCompleted,
  parseSelfEvalItems,
  parseSteps,
  parseStepRules,
  passed,
  prevStep,
  resumeStep,
  stepLock,
  STEP_LABELS,
  type LearnStep,
} from "@/lib/vlab";
import {
  myAttemptsQuery,
  myProgressQuery,
  mySelfEvalQuery,
  studentModuleQuery,
  type StudentModuleData,
} from "@/lib/vlab-queries";

const ALL_STEPS: LearnStep[] = ["pre_test", "materi", "prosedur", "simulasi", "post_test", "self_evaluation", "ringkasan"];


type ProgressRow = Tables<"learning_progress">;

export default function LearnPage() {
  const { id } = useParams();
  const { data: m, isLoading } = useQuery(studentModuleQuery(id));
  const { data: progress, isLoading: loadingProgress } = useQuery(myProgressQuery(id));
  if (isLoading || loadingProgress) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!m)
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Modul ini belum dipublikasikan atau Anda tidak punya akses.</p>
        <Button asChild variant="outline">
          <Link to="/modul-praktikum">
            <ArrowLeft /> Modul Praktikum
          </Link>
        </Button>
      </div>
    );
  return <Learn module={m} progress={progress ?? null} />;
}

function Learn({ module: m, progress }: { module: StudentModuleData; progress: ProgressRow | null }) {
  const { step: rawStep } = useSearch<{ step?: string }>();
  const wanted = ALL_STEPS.includes(rawStep as LearnStep) ? (rawStep as LearnStep) : undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const steps = parseSteps(m.step_order);
  const rules = parseStepRules(m.step_rules);
  const done = parseCompleted(progress?.completed_steps);
  const fallback = resumeStep(steps, done, progress?.current_step, rules);
  const step: LearnStep = wanted && canOpenStep(steps, done, wanted, rules) ? wanted : fallback;
  const [busy, setBusy] = useState(false);
  const lastSaved = useRef<string | null>(null);

  const pre = m.assessments.find((a) => a.type === "pre_test");
  const post = m.assessments.find((a) => a.type === "post_test");
  const current = step === "pre_test" ? pre : step === "post_test" ? post : undefined;
  const { data: attempts } = useQuery({ ...myAttemptsQuery(current?.id ?? ""), enabled: !!current });
  const { data: selfResp } = useQuery({ ...mySelfEvalQuery(m.self_evaluations?.id ?? ""), enabled: !!m.self_evaluations });

  async function record(currentStep: LearnStep, completed: LearnStep | null) {
    const { data, error } = await supabase.rpc("record_progress", {
      _module_id: m.id,
      _current_step: currentStep,
      _completed_step: completed as string,
    });
    if (error) throw error;
    qc.setQueryData(myProgressQuery(m.id).queryKey, data as unknown as ProgressRow);
    void qc.invalidateQueries({ queryKey: ["vlab", "student-modules"] });
  }

  // Keep the URL on an unlocked step, and remember where the student is.
  useEffect(() => {
    if (wanted !== step) navigate({ search: { step }, replace: true });
    if (lastSaved.current === step) return;
    lastSaved.current = step;
    record(step, null).catch((e) => toast.error(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canFinish =
    step === "ringkasan"
      ? false
      : step === "pre_test" || step === "post_test"
        ? !current || (attempts ?? []).some((a) => a.status !== "in_progress")
        : step === "self_evaluation"
          ? !m.self_evaluations || !!selfResp
          : true;
  const next = nextStep(steps, step);
  const prev = prevStep(steps, step);

  async function finish() {
    if (step === "ringkasan" || !next) return;
    setBusy(true);
    try {
      await record(next, step);
      lastSaved.current = next;
      navigate({ search: { step: next } });
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const pct = Number(progress?.percent ?? 0);
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/modul-praktikum/$id" params={{ id: m.id }}>
          <ArrowLeft /> {m.title}
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-xl border bg-card p-4 shadow-card lg:sticky lg:top-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{m.courses?.code}</p>
          <p className="mt-1 text-sm font-semibold leading-snug">{m.title}</p>
          <div className="mt-3 flex items-center gap-2">
            <Progress value={pct} className="h-2" aria-label="Progres belajar" />
            <span className="w-10 text-right text-xs tabular-nums">{Math.round(pct)}%</span>
          </div>
          <nav aria-label="Tahapan belajar" className="mt-4">
            <ol className="space-y-1">
              {[...steps, "ringkasan" as const].map((s, i) => {
                const open = canOpenStep(steps, done, s, rules);
                const requirement = open ? null : stepLock(steps, done, rules, s);
                const isDone = s !== "ringkasan" && done.includes(s);
                const active = s === step;
                const Icon = isDone ? CheckCircle2 : open ? Circle : Lock;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={!open}
                      onClick={() => navigate({ search: { step: s } })}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition",
                        active ? "bg-primary text-primary-foreground" : open ? "hover:bg-muted" : "cursor-not-allowed text-muted-foreground",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isDone && !active && "text-success")} aria-hidden />
                      <span className="flex-1">
                        {i + 1}. {STEP_LABELS[s]}
                      </span>
                      <span className="sr-only">{isDone ? "selesai" : open ? "terbuka" : "terkunci"}</span>
                    </button>
                    {requirement && (
                      <p className="px-2.5 pb-1 pt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium">Terkunci.</span> {requirement}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Tahap {step === "ringkasan" ? steps.length + 1 : steps.indexOf(step) + 1} dari {steps.length + 1}
              </p>
              <h1 className="text-2xl font-bold">{STEP_LABELS[step]}</h1>
            </div>
            {step !== "ringkasan" && done.includes(step) && <StatusBadge label="Selesai" tone="success" />}
          </div>

          {step === "pre_test" && <AssessmentStep type="pre_test" assessment={pre} />}
          {step === "post_test" && <AssessmentStep type="post_test" assessment={post} />}
          {step === "materi" && <MaterialsView module={m} />}
          {step === "prosedur" && <ProceduresView module={m} />}
          {step === "simulasi" && <SimulationsView module={m} />}
          {step === "self_evaluation" && <SelfEvalStep selfEval={m.self_evaluations} />}
          {step === "ringkasan" && <Summary module={m} progress={progress} selfAnswers={(selfResp?.answers ?? null) as Record<string, number> | null} />}

          {step !== "ringkasan" && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              {prev ? (
                <Button variant="outline" onClick={() => navigate({ search: { step: prev } })}>
                  <ArrowLeft /> {STEP_LABELS[prev]}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                {!canFinish && (
                  <span className="text-sm text-muted-foreground">
                    {step === "self_evaluation" ? "Kirim self-evaluation untuk melanjutkan." : "Kumpulkan jawaban untuk melanjutkan."}
                  </span>
                )}
                <Button onClick={finish} disabled={!canFinish || busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {next === "ringkasan" ? "Selesai & lihat ringkasan" : `Selesai, lanjut ke ${STEP_LABELS[next!]}`}
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Summary({
  module: m,
  progress,
  selfAnswers,
}: {
  module: StudentModuleData;
  progress: ProgressRow | null;
  selfAnswers: Record<string, number> | null;
}) {
  const pre = m.assessments.find((a) => a.type === "pre_test");
  const post = m.assessments.find((a) => a.type === "post_test");
  const { data: preAttempts } = useQuery({ ...myAttemptsQuery(pre?.id ?? ""), enabled: !!pre });
  const { data: postAttempts } = useQuery({ ...myAttemptsQuery(post?.id ?? ""), enabled: !!post });
  const preBest = bestScore(preAttempts ?? []);
  const postBest = bestScore(postAttempts ?? []);
  const waiting = [...(preAttempts ?? []), ...(postAttempts ?? [])].some((a) => a.status === "waiting_review");
  const lulus = passed(postBest, post?.passing_grade);
  const items = parseSelfEvalItems(m.self_evaluations?.items);
  const selfAvg =
    selfAnswers && items.length ? items.reduce((s, it) => s + Number(selfAnswers[it.id] ?? 0), 0) / items.length : null;
  const st = learningStatus(progress);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-5 rounded-xl border bg-card p-6 shadow-card">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Trophy className="size-7" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Selamat, Anda menyelesaikan modul ini!</h2>
          <p className="text-sm text-muted-foreground">Selesai {formatDate(progress?.completed_at, true)}</p>
        </div>
        <StatusBadge {...st} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard label="Pre-test (terbaik)" value={pre ? formatScore(preBest) : "—"} />
        <ScoreCard
          label="Post-test (terbaik)"
          value={post ? formatScore(postBest) : "—"}
          badge={lulus == null ? undefined : { label: lulus ? "Lulus" : "Belum lulus", tone: lulus ? "success" : "danger" }}
        />
        <ScoreCard
          label="Peningkatan"
          value={preBest != null && postBest != null ? `${postBest - preBest >= 0 ? "+" : ""}${formatScore(Math.round((postBest - preBest) * 10) / 10)}` : "—"}
        />
      </div>
      {waiting && (
        <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Sebagian jawaban esai masih menunggu koreksi dosen. Nilai akan diperbarui setelah dikoreksi.
        </p>
      )}
      {m.self_evaluations && (
        <section className="rounded-xl border bg-card p-6 shadow-card">
          <h3 className="mb-1 font-semibold">Self-evaluation</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Rata-rata {selfAvg == null ? "—" : formatScore(Math.round(selfAvg * 10) / 10)} dari 5
          </p>
          <ul className="space-y-2 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                <span>{it.text}</span>
                <span className="shrink-0 text-muted-foreground">
                  {selfAnswers?.[it.id] ? `${selfAnswers[it.id]} · ${LIKERT_LABELS[selfAnswers[it.id]! - 1]}` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/modul-praktikum">Kembali ke Modul Praktikum</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/progres-belajar">Lihat Progres Belajar</Link>
        </Button>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: { label: string; tone: "success" | "danger" } | undefined;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {badge && <StatusBadge {...badge} className="mt-2" />}
    </div>
  );
}
