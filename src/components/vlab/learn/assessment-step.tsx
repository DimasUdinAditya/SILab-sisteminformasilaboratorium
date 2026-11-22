import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { ReviewQuestionCard } from "@/components/vlab/review-question";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ASSESSMENT_LABELS,
  ATTEMPT_STATUS_META,
  canStartAttempt,
  errorMessage,
  formatClock,
  formatDate,
  formatScore,
  passed,
  QUESTION_TYPE_LABELS,
  remainingSeconds,
  type AssessmentType,
} from "@/lib/vlab";
import { attemptReviewQuery, myAttemptsQuery, studentAssessmentQuery, type StudentModuleData } from "@/lib/vlab-queries";

type Meta = StudentModuleData["assessments"][number];
type Answers = Record<string, { selected: string[]; text: string }>;

export function AssessmentStep({ type, assessment }: { type: AssessmentType; assessment: Meta | undefined }) {
  const label = ASSESSMENT_LABELS[type];
  if (!assessment)
    return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-card">Modul ini tidak memiliki {label}. Silakan lanjut.</p>;
  return <AssessmentPanel assessment={assessment} label={label} />;
}

function AssessmentPanel({ assessment, label }: { assessment: Meta; label: string }) {
  const qc = useQueryClient();
  const { data: attempts, isLoading } = useQuery(myAttemptsQuery(assessment.id));
  const [starting, setStarting] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const running = attempts?.find((a) => a.status === "in_progress");
  const used = attempts?.length ?? 0;
  const allowed = canStartAttempt(assessment.max_attempt, used);
  const questionCount = assessment.questions[0]?.count ?? 0;

  async function start() {
    setStarting(true);
    const { error } = await supabase.rpc("start_attempt", { _assessment_id: assessment.id });
    setStarting(false);
    if (error) return void toast.error(errorMessage(error));
    await qc.invalidateQueries({ queryKey: myAttemptsQuery(assessment.id).queryKey });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (running) return <AttemptRunner attemptId={running.id} startedAt={running.started_at} assessmentId={assessment.id} durationMin={assessment.duration_min} />;

  const submitted = (attempts ?? []).filter((a) => a.status !== "in_progress");
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h3 className="text-lg font-semibold">{assessment.title}</h3>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
          <Info label="Jumlah soal" value={String(questionCount)} />
          <Info label="Durasi" value={assessment.duration_min ? `${assessment.duration_min} menit` : "Tanpa batas"} />
          <Info label="Percobaan" value={`${used} dari ${assessment.max_attempt ?? "tak terbatas"}`} />
          <Info label="Nilai lulus" value={assessment.passing_grade == null ? "—" : formatScore(assessment.passing_grade)} />
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {allowed ? (
            <Button onClick={start} disabled={starting || questionCount === 0}>
              {starting ? <Loader2 className="animate-spin" /> : submitted.length ? <RotateCcw /> : <PlayCircle />}
              {submitted.length ? `Ulangi ${label}` : `Mulai ${label}`}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Batas percobaan sudah tercapai.</p>
          )}
          {assessment.duration_min && allowed && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> Waktu berjalan sejak tombol ditekan dan jawaban dikumpulkan otomatis saat waktu habis.
            </span>
          )}
        </div>
      </div>
      {submitted.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Percobaan</TableHead>
                <TableHead>Dikumpulkan</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submitted.map((a) => {
                const lulus = passed(a.total_score, assessment.passing_grade);
                return (
                  <TableRow key={a.id}>
                    <TableCell>Ke-{a.attempt_no}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.submitted_at, true)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatScore(a.total_score)}</TableCell>
                    <TableCell className="space-x-2">
                      <StatusBadge {...ATTEMPT_STATUS_META[a.status]} />
                      {lulus != null && <StatusBadge label={lulus ? "Lulus" : "Belum lulus"} tone={lulus ? "success" : "danger"} />}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setReviewId(reviewId === a.id ? null : a.id)}>
                        {reviewId === a.id ? "Tutup" : "Lihat jawaban"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {reviewId && <AttemptReviewList attemptId={reviewId} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function AttemptReviewList({ attemptId }: { attemptId: string }) {
  const { data, isLoading } = useQuery(attemptReviewQuery(attemptId));
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Memuat jawaban…</p>;
  return (
    <div className="space-y-4">
      {data.questions.map((q, i) => (
        <ReviewQuestionCard key={q.id} q={q} index={i} showKey={false} />
      ))}
    </div>
  );
}

function AttemptRunner({
  attemptId,
  startedAt,
  assessmentId,
  durationMin,
}: {
  attemptId: string;
  startedAt: string;
  assessmentId: string;
  durationMin: number | null;
}) {
  const qc = useQueryClient();
  const { data: a, isLoading, error } = useQuery(studentAssessmentQuery(assessmentId));
  const storageKey = `labvir-attempt-${attemptId}`;
  // Authenticated pages render only in the browser, so sessionStorage is safe to read on first render.
  // Restoring answers before the first effect keeps them when the page is reloaded mid-attempt.
  const [answers, setAnswers] = useState<Answers>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) ?? "{}") as Answers;
    } catch {
      return {};
    }
  });
  const [left, setLeft] = useState<number | null>(() => remainingSeconds(startedAt, durationMin));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !a) return;
      submittedRef.current = true;
      setBusy(true);
      const payload = a.questions.map((q) =>
        q.type === "esai"
          ? { question_id: q.id, answer_text: answers[q.id]?.text ?? "" }
          : { question_id: q.id, selected_options: answers[q.id]?.selected ?? [] },
      );
      const { data, error } = await supabase.rpc("submit_attempt", { _attempt_id: attemptId, _answers: payload });
      setBusy(false);
      setConfirm(false);
      if (error) {
        submittedRef.current = false;
        return void toast.error(errorMessage(error));
      }
      sessionStorage.removeItem(storageKey);
      const r = data as { status: string; total_score: number | null };
      if (auto) toast.info("Waktu habis. Jawaban dikumpulkan otomatis.");
      toast.success(
        r.status === "waiting_review" ? "Jawaban terkumpul. Nilai akhir tampil setelah esai dikoreksi dosen." : `Jawaban terkumpul. Nilai Anda ${formatScore(r.total_score)}.`,
      );
      await qc.invalidateQueries({ queryKey: ["vlab"] });
    },
    [a, answers, attemptId, qc, storageKey],
  );

  useEffect(() => {
    if (!durationMin) return;
    const t = setInterval(() => setLeft(remainingSeconds(startedAt, durationMin)), 1000);
    return () => clearInterval(t);
  }, [startedAt, durationMin]);
  useEffect(() => {
    if (left === 0 && a) void submit(true);
  }, [left, a, submit]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat soal…</p>;
  if (error || !a) return <p className="text-sm text-destructive">{errorMessage(error)}</p>;

  const answered = (id: string, type: string) =>
    type === "esai" ? !!answers[id]?.text.trim() : (answers[id]?.selected.length ?? 0) > 0;
  const unanswered = a.questions.filter((q) => !answered(q.id, q.type)).length;
  const set = (id: string, v: Partial<{ selected: string[]; text: string }>) =>
    setAnswers((all) => ({ ...all, [id]: { selected: all[id]?.selected ?? [], text: all[id]?.text ?? "", ...v } }));

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-4 shadow-card backdrop-blur">
        <div className="mr-auto">
          <p className="font-semibold">{a.title}</p>
          <p className="text-xs text-muted-foreground">
            {a.questions.length - unanswered} dari {a.questions.length} soal terjawab
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {a.questions.map((q, i) => (
            <a
              key={q.id}
              href={`#soal-${i + 1}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border text-xs font-medium",
                answered(q.id, q.type) ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
              )}
              aria-label={`Soal ${i + 1}${answered(q.id, q.type) ? " (terjawab)" : ""}`}
            >
              {i + 1}
            </a>
          ))}
        </div>
        {left != null && (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-sm font-semibold",
              left < 60 ? "bg-danger-soft text-destructive" : "bg-muted",
            )}
            aria-live="polite"
          >
            <Clock className="size-4" /> {formatClock(left)}
          </span>
        )}
        <Button onClick={() => setConfirm(true)} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Kumpulkan
        </Button>
      </div>

      {a.questions.map((q, i) => (
        <fieldset key={q.id} id={`soal-${i + 1}`} className="scroll-mt-28 rounded-xl border bg-card p-5 shadow-card">
          <legend className="sr-only">Soal {i + 1}</legend>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold">Soal {i + 1}</span>
            <StatusBadge label={QUESTION_TYPE_LABELS[q.type]} tone="neutral" />
            <span className="text-xs text-muted-foreground">Bobot {formatScore(q.score)}</span>
          </div>
          <p className="mb-4 whitespace-pre-line text-sm">{q.question_text}</p>
          {q.type === "esai" ? (
            <Textarea rows={5} value={answers[q.id]?.text ?? ""} onChange={(e) => set(q.id, { text: e.target.value })} placeholder="Tulis jawaban Anda" aria-label={`Jawaban soal ${i + 1}`} maxLength={10000} />
          ) : q.type === "pg_kompleks" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Pilih semua jawaban yang benar.</p>
              {q.options.map((o, n) => {
                const sel = answers[q.id]?.selected ?? [];
                return (
                  <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={sel.includes(o.id)}
                      onCheckedChange={(v) => set(q.id, { selected: v === true ? [...sel, o.id] : sel.filter((x) => x !== o.id) })}
                    />
                    <span className="w-5 font-medium text-muted-foreground">{String.fromCharCode(65 + n)}.</span>
                    {o.option_text}
                  </label>
                );
              })}
            </div>
          ) : (
            <RadioGroup value={answers[q.id]?.selected[0] ?? ""} onValueChange={(v) => set(q.id, { selected: [v] })} className="gap-2">
              {q.options.map((o, n) => (
                <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                  <RadioGroupItem value={o.id} />
                  <span className="w-5 font-medium text-muted-foreground">{String.fromCharCode(65 + n)}.</span>
                  {o.option_text}
                </label>
              ))}
            </RadioGroup>
          )}
        </fieldset>
      ))}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan jawaban?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {unanswered > 0 && (
                  <p className="mb-2 flex items-center gap-2 text-warning">
                    <AlertTriangle className="size-4" /> {unanswered} soal belum dijawab.
                  </p>
                )}
                <p>Jawaban tidak dapat diubah setelah dikumpulkan.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => (e.preventDefault(), void submit())} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Kumpulkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
