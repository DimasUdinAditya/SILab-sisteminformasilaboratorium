"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ReviewQuestionCard } from "@/components/vlab/review-question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ASSESSMENT_LABELS, ATTEMPT_STATUS_META, errorMessage, formatDate, formatScore, passed } from "@/lib/vlab";
import { attemptReviewQuery, dosenAttemptsQuery } from "@/lib/vlab-queries";


export default function GradePage() {
  const { attemptId } = useParams();
  const { data: review, isLoading, error } = useQuery(attemptReviewQuery(attemptId));
  const { data: attempts } = useQuery(dosenAttemptsQuery);
  const qc = useQueryClient();
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busy, setBusy] = useState(false);
  const meta = attempts?.find((a) => a.id === attemptId);

  useEffect(() => {
    if (!review) return;
    const g: Record<string, { score: string; feedback: string }> = {};
    for (const q of review.questions)
      if (q.type === "esai" && q.answer)
        g[q.answer.id] = { score: q.answer.score == null ? "" : String(q.answer.score), feedback: q.answer.feedback ?? "" };
    setGrades(g);
  }, [review]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (error || !review)
    return (
      <div>
        <PageHeader title="Percobaan tidak ditemukan" description={error ? errorMessage(error) : undefined} />
        <Button asChild variant="outline">
          <Link to="/assessment">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
      </div>
    );

  const essays = review.questions.filter((q) => q.type === "esai" && q.answer);
  const lulus = passed(review.attempt.total_score, review.assessment.passing_grade);

  async function save() {
    const payload = Object.entries(grades)
      .filter(([, g]) => g.score.trim() !== "")
      .map(([answer_id, g]) => ({ answer_id, score: Number(g.score), feedback: g.feedback }));
    if (!payload.length) return void toast.error("Isi nilai minimal satu jawaban esai.");
    setBusy(true);
    const { data, error } = await supabase.rpc("grade_attempt", { _attempt_id: attemptId, _grades: payload });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    const r = data as { status: string; total_score: number | null; pending: number };
    toast.success(r.pending ? `Nilai disimpan. ${r.pending} esai belum dinilai.` : `Selesai dinilai. Nilai akhir ${formatScore(r.total_score)}.`);
    await qc.invalidateQueries({ queryKey: ["vlab"] });
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/assessment">
          <ArrowLeft /> Assessment
        </Link>
      </Button>
      <PageHeader
        title={`${ASSESSMENT_LABELS[review.assessment.type]} · ${meta?.profiles?.name ?? "Mahasiswa"}`}
        description={`${meta?.assessments?.modules?.title ?? review.assessment.title} · Percobaan ke-${review.attempt.attempt_no} · Dikumpulkan ${formatDate(review.attempt.submitted_at, true)}`}
      />
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-card">
        <div>
          <p className="text-xs text-muted-foreground">Nilai akhir</p>
          <p className="font-display text-3xl font-bold">{formatScore(review.attempt.total_score)}</p>
        </div>
        <StatusBadge {...ATTEMPT_STATUS_META[review.attempt.status]} />
        {lulus != null && <StatusBadge label={lulus ? "Lulus" : "Belum lulus"} tone={lulus ? "success" : "danger"} />}
        {review.assessment.passing_grade != null && (
          <span className="text-sm text-muted-foreground">Nilai lulus {formatScore(review.assessment.passing_grade)}</span>
        )}
      </div>
      <div className="space-y-4">
        {review.questions.map((q, i) => (
          <ReviewQuestionCard key={q.id} q={q} index={i} showKey>
            {q.type === "esai" && q.answer && (
              <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-4 md:grid-cols-[160px_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor={`s-${q.id}`}>Nilai (0–{Number(q.score)})</Label>
                  <Input
                    id={`s-${q.id}`}
                    type="number"
                    min={0}
                    max={Number(q.score)}
                    step={0.5}
                    value={grades[q.answer.id]?.score ?? ""}
                    onChange={(e) => setGrades((g) => ({ ...g, [q.answer!.id]: { ...g[q.answer!.id]!, score: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`f-${q.id}`}>Umpan balik (opsional)</Label>
                  <Textarea
                    id={`f-${q.id}`}
                    rows={2}
                    value={grades[q.answer.id]?.feedback ?? ""}
                    onChange={(e) => setGrades((g) => ({ ...g, [q.answer!.id]: { ...g[q.answer!.id]!, feedback: e.target.value } }))}
                  />
                </div>
              </div>
            )}
          </ReviewQuestionCard>
        ))}
      </div>
      {essays.length > 0 && (
        <div className="sticky bottom-0 mt-6 flex justify-end border-t bg-background/95 py-4 backdrop-blur">
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Simpan nilai
          </Button>
        </div>
      )}
    </div>
  );
}
