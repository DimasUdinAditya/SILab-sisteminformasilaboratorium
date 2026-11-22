import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDelete } from "@/components/vlab/editor/materials-tab";
import { EmptyState, SectionCard, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { SortableList } from "@/components/vlab/sortable-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  ASSESSMENT_LABELS,
  errorMessage,
  parseSteps,
  QUESTION_TYPE_LABELS,
  questionHasKey,
  uuidv7,
  type AssessmentType,
  type QuestionType,
} from "@/lib/vlab";
import { topicsQuery } from "@/lib/vlab-queries";

type Assessment = EditorModule["assessments"][number];
type Question = Assessment["questions"][number];

export function AssessmentsTab({ module }: { module: EditorModule }) {
  const steps = parseSteps(module.step_order);
  return (
    <div className="space-y-6">
      {(["pre_test", "post_test"] as AssessmentType[]).map((t) => (
        <AssessmentCard
          key={t}
          module={module}
          type={t}
          used={steps.includes(t)}
          assessment={module.assessments.find((a) => a.type === t) ?? null}
        />
      ))}
    </div>
  );
}

function AssessmentCard({
  module,
  type,
  used,
  assessment,
}: {
  module: EditorModule;
  type: AssessmentType;
  used: boolean;
  assessment: Assessment | null;
}) {
  const refresh = useEditorRefresh(module.id);
  const label = ASSESSMENT_LABELS[type];
  const [title, setTitle] = useState(assessment?.title ?? "");
  const [duration, setDuration] = useState(assessment?.duration_min?.toString() ?? "");
  const [maxAttempt, setMaxAttempt] = useState(assessment?.max_attempt?.toString() ?? "");
  const [passing, setPassing] = useState(assessment?.passing_grade?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState(assessment?.questions ?? []);
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  useEffect(() => setQuestions(assessment?.questions ?? []), [assessment?.questions]);
  useEffect(() => {
    setTitle(assessment?.title ?? "");
    setDuration(assessment?.duration_min?.toString() ?? "");
    setMaxAttempt(assessment?.max_attempt?.toString() ?? "");
    setPassing(assessment?.passing_grade?.toString() ?? "");
  }, [assessment?.id, assessment?.title, assessment?.duration_min, assessment?.max_attempt, assessment?.passing_grade]);

  async function create() {
    setBusy(true);
    const { error } = await supabase.from("assessments").insert({
      module_id: module.id,
      type,
      title: `${label} — ${module.title}`,
      max_attempt: type === "pre_test" ? 1 : 3,
      passing_grade: type === "post_test" ? 70 : null,
    });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success(`${label} dibuat.`);
    await refresh();
  }

  function intOrNull(v: string, min: number, max: number, name: string): number | null | false {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) {
      toast.error(`${name} harus antara ${min} dan ${max}.`);
      return false;
    }
    return n;
  }

  async function saveSettings() {
    if (!assessment) return;
    if (!title.trim()) return void toast.error("Judul wajib diisi.");
    const d = intOrNull(duration, 1, 600, "Durasi");
    const m = intOrNull(maxAttempt, 1, 20, "Maksimal percobaan");
    const p = intOrNull(passing, 0, 100, "Nilai lulus");
    if (d === false || m === false || p === false) return;
    setBusy(true);
    const { error } = await supabase
      .from("assessments")
      .update({ title: title.trim(), duration_min: d && Math.round(d), max_attempt: m && Math.round(m), passing_grade: p })
      .eq("id", assessment.id);
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Pengaturan disimpan.");
    await refresh();
  }

  async function reorder(next: Question[]) {
    setQuestions(next);
    await Promise.all(next.map((q, i) => supabase.from("questions").update({ sort_order: i + 1 }).eq("id", q.id)));
    await refresh();
  }

  async function removeQuestion(id: string) {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Soal dihapus.");
    await refresh();
  }

  async function removeAssessment() {
    if (!assessment) return;
    const { error } = await supabase.from("assessments").delete().eq("id", assessment.id);
    if (error) return void toast.error(errorMessage(error));
    toast.success(`${label} dihapus.`);
    await refresh();
  }

  const totalScore = questions.reduce((s, q) => s + Number(q.score), 0);

  return (
    <SectionCard
      title={label}
      description={type === "pre_test" ? "Mengukur pengetahuan awal sebelum belajar." : "Mengukur pemahaman setelah belajar."}
      actions={assessment && <ConfirmDelete label={label} onConfirm={removeAssessment} />}
    >
      {!used && (
        <p className="mb-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Tahap {label} sedang tidak dipakai pada urutan belajar.
        </p>
      )}
      {!assessment ? (
        <EmptyState>
          <p className="mb-3">Belum ada {label}.</p>
          <Button onClick={create} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Buat {label}
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 rounded-lg bg-muted/50 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor={`${type}-title`}>Judul</Label>
              <Input id={`${type}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${type}-dur`}>Durasi (menit)</Label>
              <Input id={`${type}-dur`} type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Tanpa batas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${type}-max`}>Maks. percobaan</Label>
              <Input id={`${type}-max`} type="number" min={1} value={maxAttempt} onChange={(e) => setMaxAttempt(e.target.value)} placeholder="Tanpa batas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${type}-pass`}>Nilai lulus (0–100)</Label>
              <Input id={`${type}-pass`} type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(e.target.value)} placeholder="Tidak ada" />
            </div>
            <Button onClick={saveSettings} disabled={busy} variant="secondary">
              {busy && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {questions.length} soal · total bobot {totalScore}. Nilai akhir dihitung dalam skala 0–100.
              </p>
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus /> Tambah soal
              </Button>
            </div>
            {questions.length === 0 ? (
              <EmptyState>Belum ada soal.</EmptyState>
            ) : (
              <SortableList
                items={questions}
                onReorder={reorder}
                render={(q, i) => (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm">{q.question_text}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <StatusBadge label={QUESTION_TYPE_LABELS[q.type]} tone="info" />
                        <StatusBadge label={`Bobot ${Number(q.score)}`} tone="neutral" />
                        {q.topics && <StatusBadge label={q.topics.name} tone="neutral" />}
                        {!questionHasKey(q.type, q.question_options) && <StatusBadge label="Kunci jawaban belum benar" tone="warning" />}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Edit soal ${i + 1}`} onClick={() => setEditing(q)}>
                      <Pencil />
                    </Button>
                    <ConfirmDelete label={`soal ${i + 1}`} onConfirm={() => removeQuestion(q.id)} />
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}
      {editing && assessment && (
        <QuestionDialog
          assessmentId={assessment.id}
          question={editing === "new" ? null : editing}
          nextOrder={questions.length + 1}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh();
            setEditing(null);
          }}
        />
      )}
    </SectionCard>
  );
}

type OptionDraft = { id: string; option_text: string; is_correct: boolean; isNew: boolean };

function defaultOptions(type: QuestionType): OptionDraft[] {
  if (type === "esai") return [];
  if (type === "benar_salah")
    return ["Benar", "Salah"].map((t) => ({ id: uuidv7(), option_text: t, is_correct: false, isNew: true }));
  return [0, 1, 2, 3].map(() => ({ id: uuidv7(), option_text: "", is_correct: false, isNew: true }));
}

function QuestionDialog({
  assessmentId,
  question,
  nextOrder,
  onClose,
  onSaved,
}: {
  assessmentId: string;
  question: Question | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const { data: topics } = useQuery(topicsQuery);
  const [type, setType] = useState<QuestionType>(question?.type ?? "pg");
  const [text, setText] = useState(question?.question_text ?? "");
  const [score, setScore] = useState(String(question ? Number(question.score) : 1));
  const [topicId, setTopicId] = useState<string>(question?.topic_id ?? "none");
  const [newTopic, setNewTopic] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>(
    question ? question.question_options.map((o) => ({ ...o, isNew: false })) : defaultOptions("pg"),
  );
  const [busy, setBusy] = useState(false);

  function changeType(t: QuestionType) {
    setType(t);
    if (t === "esai") setOptions([]);
    else if (t === "benar_salah") setOptions(defaultOptions(t));
    else if (type === "esai" || type === "benar_salah") setOptions(defaultOptions(t));
    else if (t === "pg") {
      // single answer: keep only the first correct option
      let seen = false;
      setOptions((os) => os.map((o) => ({ ...o, is_correct: o.is_correct && !seen ? (seen = true) : false })));
    }
  }

  function setCorrect(id: string, on: boolean) {
    setOptions((os) =>
      os.map((o) => (type === "pg_kompleks" ? (o.id === id ? { ...o, is_correct: on } : o) : { ...o, is_correct: o.id === id })),
    );
  }

  async function save() {
    if (!text.trim()) return void toast.error("Teks soal wajib diisi.");
    const s = Number(score);
    if (!Number.isFinite(s) || s <= 0 || s > 1000) return void toast.error("Bobot harus lebih dari 0.");
    const opts = options.map((o) => ({ ...o, option_text: o.option_text.trim() }));
    if (type !== "esai") {
      if (opts.length < 2) return void toast.error("Minimal dua pilihan jawaban.");
      if (opts.some((o) => !o.option_text)) return void toast.error("Semua pilihan jawaban wajib diisi.");
      if (!questionHasKey(type, opts))
        return void toast.error(type === "pg_kompleks" ? "Tandai minimal satu jawaban benar." : "Tandai tepat satu jawaban benar.");
    }
    setBusy(true);
    try {
      let topic: string | null = topicId === "none" || topicId === "new" ? null : topicId;
      if (topicId === "new" && newTopic.trim()) {
        const name = newTopic.trim();
        const existing = topics?.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (existing) topic = existing.id;
        else {
          const { data, error } = await supabase.from("topics").insert({ name }).select("id").single();
          if (error) throw error;
          topic = data.id;
          await qc.invalidateQueries({ queryKey: topicsQuery.queryKey });
        }
      }
      const row = { type, question_text: text.trim(), score: s, topic_id: topic };
      let qid = question?.id;
      if (question) {
        const { error } = await supabase.from("questions").update(row).eq("id", question.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert({ ...row, assessment_id: assessmentId, sort_order: nextOrder })
          .select("id")
          .single();
        if (error) throw error;
        qid = data.id;
      }
      const keep = new Set(opts.filter((o) => !o.isNew).map((o) => o.id));
      const removed = (question?.question_options ?? []).filter((o) => !keep.has(o.id)).map((o) => o.id);
      if (removed.length) {
        const { error } = await supabase.from("question_options").delete().in("id", removed);
        if (error) throw error;
      }
      for (const o of opts.filter((o) => !o.isNew)) {
        const { error } = await supabase
          .from("question_options")
          .update({ option_text: o.option_text, is_correct: o.is_correct })
          .eq("id", o.id);
        if (error) throw error;
      }
      const fresh = opts.filter((o) => o.isNew);
      if (fresh.length) {
        const { error } = await supabase
          .from("question_options")
          .insert(fresh.map((o) => ({ id: o.id, question_id: qid!, option_text: o.option_text, is_correct: o.is_correct })));
        if (error) throw error;
      }
      toast.success("Soal disimpan.");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const correctId = options.find((o) => o.is_correct)?.id ?? "";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit soal" : "Tambah soal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Jenis soal</Label>
              <Select value={type} onValueChange={(v) => changeType(v as QuestionType)}>
                <SelectTrigger aria-label="Jenis soal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-score">Bobot</Label>
              <Input id="q-score" type="number" min={0.5} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Topik</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger aria-label="Topik">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa topik</SelectItem>
                  {topics?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Topik baru…</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {topicId === "new" && (
            <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Nama topik baru" maxLength={100} aria-label="Nama topik baru" />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Pertanyaan</Label>
            <Textarea id="q-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
          </div>
          {type === "esai" ? (
            <p className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
              Jawaban esai dinilai manual oleh dosen di menu Assessment. Nilai akhir tampil setelah semua esai dinilai.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>
                Pilihan jawaban —{" "}
                <span className="font-normal text-muted-foreground">
                  {type === "pg_kompleks" ? "centang semua jawaban benar" : "pilih satu jawaban benar"}
                </span>
              </Label>
              {type === "pg_kompleks" ? (
                options.map((o, i) => (
                  <OptionRow key={o.id} index={i} option={o} canRemove={options.length > 2} fixed={false}
                    onText={(t) => setOptions((os) => os.map((x) => (x.id === o.id ? { ...x, option_text: t } : x)))}
                    onRemove={() => setOptions((os) => os.filter((x) => x.id !== o.id))}
                    marker={<Checkbox checked={o.is_correct} onCheckedChange={(v) => setCorrect(o.id, v === true)} aria-label={`Pilihan ${i + 1} benar`} />}
                  />
                ))
              ) : (
                <RadioGroup value={correctId} onValueChange={(id) => setCorrect(id, true)} className="gap-2">
                  {options.map((o, i) => (
                    <OptionRow key={o.id} index={i} option={o} canRemove={options.length > 2 && type === "pg"} fixed={type === "benar_salah"}
                      onText={(t) => setOptions((os) => os.map((x) => (x.id === o.id ? { ...x, option_text: t } : x)))}
                      onRemove={() => setOptions((os) => os.filter((x) => x.id !== o.id))}
                      marker={<RadioGroupItem value={o.id} aria-label={`Pilihan ${i + 1} benar`} />}
                    />
                  ))}
                </RadioGroup>
              )}
              {type !== "benar_salah" && options.length < 8 && (
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setOptions((os) => [...os, { id: uuidv7(), option_text: "", is_correct: false, isNew: true }])}>
                  <Plus /> Tambah pilihan
                </Button>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Simpan soal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  index,
  option,
  marker,
  onText,
  onRemove,
  canRemove,
  fixed,
}: {
  index: number;
  option: OptionDraft;
  marker: React.ReactNode;
  onText: (t: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  fixed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {marker}
      <span className="w-5 text-sm font-medium text-muted-foreground">{String.fromCharCode(65 + index)}.</span>
      <Input value={option.option_text} onChange={(e) => onText(e.target.value)} disabled={fixed} maxLength={1000} aria-label={`Teks pilihan ${index + 1}`} />
      {canRemove && (
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Hapus pilihan ${index + 1}`}>
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
