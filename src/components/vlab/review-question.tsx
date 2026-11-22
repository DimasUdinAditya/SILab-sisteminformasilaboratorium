import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";
import { formatScore, QUESTION_TYPE_LABELS } from "@/lib/vlab";
import type { ReviewQuestion } from "@/lib/vlab-queries";

/** One answered question. showKey reveals the correct options (lecturer view only). */
export function ReviewQuestionCard({
  q,
  index,
  showKey,
  children,
}: {
  q: ReviewQuestion;
  index: number;
  showKey: boolean;
  children?: ReactNode;
}) {
  const selected = new Set(q.answer?.selected_options ?? []);
  const got = q.answer?.score;
  const full = got != null && Number(got) >= Number(q.score);
  const status =
    q.type === "esai"
      ? got == null
        ? { label: "Menunggu koreksi", tone: "warning" as const }
        : { label: `Nilai ${formatScore(got)}/${formatScore(q.score)}`, tone: "info" as const }
      : full
        ? { label: "Benar", tone: "success" as const }
        : { label: "Salah", tone: "danger" as const };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Soal {index + 1}</span>
        <StatusBadge label={QUESTION_TYPE_LABELS[q.type]} tone="neutral" />
        {q.topic && <StatusBadge label={q.topic} tone="neutral" />}
        <span className="text-xs text-muted-foreground">Bobot {formatScore(q.score)}</span>
        <span className="ml-auto">
          <StatusBadge {...status} />
        </span>
      </div>
      <p className="whitespace-pre-line text-sm">{q.question_text}</p>
      {q.type === "esai" ? (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Jawaban mahasiswa</p>
          <p className="whitespace-pre-line">{q.answer?.answer_text || <span className="italic text-muted-foreground">Tidak dijawab</span>}</p>
          {!children && q.answer?.feedback && (
            <p className="mt-3 border-t pt-2 text-sm">
              <span className="font-medium">Umpan balik dosen:</span> {q.answer.feedback}
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {q.options.map((o, i) => {
            const picked = selected.has(o.id);
            const correct = showKey && o.is_correct;
            return (
              <li
                key={o.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  correct && "border-success bg-success-soft",
                  picked && showKey && !o.is_correct && "border-destructive bg-danger-soft",
                  picked && !showKey && "border-primary bg-primary-soft",
                )}
              >
                <span className="w-5 font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{o.option_text}</span>
                {picked && <span className="text-xs font-medium">Dipilih</span>}
                {showKey && o.is_correct && <Check className="size-4 text-success" aria-label="Jawaban benar" />}
                {showKey && picked && !o.is_correct && <X className="size-4 text-destructive" aria-label="Jawaban salah" />}
              </li>
            );
          })}
        </ul>
      )}
      {children}
    </div>
  );
}
