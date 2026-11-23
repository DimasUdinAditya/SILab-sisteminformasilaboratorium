import type { Database } from "@/integrations/supabase/types";

type Enums = Database["public"]["Enums"];
export type ModuleStatus = Enums["module_status"];
export type MaterialType = Enums["material_type"];
export type QuestionType = Enums["question_type"];
export type AttemptStatus = Enums["attempt_status"];
export type AssessmentType = Enums["assessment_type"];
export type SimulationType = Enums["simulation_type"];
export type MediaType = Enums["media_type"];

export type StepKey = "pre_test" | "materi" | "prosedur" | "simulasi" | "post_test" | "self_evaluation";
export type LearnStep = StepKey | "ringkasan";

export const DEFAULT_STEPS: StepKey[] = ["pre_test", "materi", "prosedur", "simulasi", "post_test", "self_evaluation"];

export const STEP_LABELS: Record<LearnStep, string> = {
  pre_test: "Pre-test",
  materi: "Materi",
  prosedur: "Prosedur",
  simulasi: "Simulasi",
  post_test: "Post-test",
  self_evaluation: "Self-evaluation",
  ringkasan: "Ringkasan",
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  text: "Teks",
  image: "Gambar",
  diagram: "Diagram",
  pdf: "Dokumen",
  reference: "Referensi",
  hotspot: "Gambar Hotspot",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  pg: "Pilihan ganda",
  pg_kompleks: "PG kompleks",
  benar_salah: "Benar / Salah",
  esai: "Esai",
};

export const ASSESSMENT_LABELS: Record<AssessmentType, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
};

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const MODULE_STATUS_META: Record<ModuleStatus, { label: string; tone: Tone }> = {
  Draft: { label: "Draft", tone: "neutral" },
  Published: { label: "Published", tone: "success" },
};

export const ATTEMPT_STATUS_META: Record<AttemptStatus, { label: string; tone: Tone }> = {
  in_progress: { label: "Sedang dikerjakan", tone: "info" },
  waiting_review: { label: "Menunggu koreksi", tone: "warning" },
  graded: { label: "Dinilai", tone: "success" },
};

/** Reads modules.step_order, keeping only known steps in their stored order. */
export function parseSteps(stepOrder: unknown): StepKey[] {
  if (!Array.isArray(stepOrder)) return DEFAULT_STEPS;
  const steps = stepOrder.filter((s): s is StepKey => (DEFAULT_STEPS as string[]).includes(String(s)));
  return steps.length ? steps : DEFAULT_STEPS;
}

export function parseCompleted(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** Step to reopen on "Lanjutkan Belajar": the saved step, else the first unfinished one. */
export function resumeStep(steps: StepKey[], completed: string[], current: string | null | undefined, rules: StepRules = {}): LearnStep {
  if (current && (current === "ringkasan" || (steps as string[]).includes(current)) && canOpenStep(steps, completed, current as LearnStep, rules))
    return current as LearnStep;
  return steps.find((s) => !completed.includes(s)) ?? "ringkasan";
}

// ---------------------------------------------------------------- aturan buka tahapan

export type UnlockMode = "always" | "after_previous" | "after_step";
export type StepRule = { mode: UnlockMode; after?: StepKey };
export type StepRules = Partial<Record<StepKey, StepRule>>;

export const UNLOCK_MODE_LABELS: Record<UnlockMode, string> = {
  always: "Selalu terbuka",
  after_previous: "Setelah tahap sebelumnya",
  after_step: "Setelah tahap tertentu",
};

/** Reads modules.step_rules. Unknown or invalid entries are dropped, so those steps use the default. */
export function parseStepRules(value: unknown): StepRules {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: StepRules = {};
  for (const key of DEFAULT_STEPS) {
    const r = raw[key];
    if (!r || typeof r !== "object") continue;
    const mode = (r as { mode?: unknown }).mode;
    if (mode === "always" || mode === "after_previous") {
      out[key] = { mode };
    } else if (mode === "after_step") {
      const after = (r as { after?: unknown }).after;
      if (typeof after === "string" && (DEFAULT_STEPS as string[]).includes(after) && after !== key) {
        out[key] = { mode, after: after as StepKey };
      }
    }
  }
  return out;
}

/**
 * Why a step is still locked for a student, as a requirement sentence. Null means it can be opened.
 * "after_step" only counts a step that comes earlier in the order, so the rules cannot deadlock.
 */
export function stepLock(steps: StepKey[], completed: string[], rules: StepRules, step: LearnStep): string | null {
  if (step === "ringkasan") {
    return steps.every((s) => completed.includes(s)) ? null : "Selesaikan semua tahap terlebih dahulu.";
  }
  const idx = steps.indexOf(step);
  if (idx < 0) return "Tahap ini tidak dipakai di modul ini.";
  const rule = rules[step];
  if (rule?.mode === "always") return null;
  const afterIdx = rule?.mode === "after_step" && rule.after ? steps.indexOf(rule.after) : -1;
  const need = afterIdx >= 0 && afterIdx < idx ? steps[afterIdx] : idx > 0 ? steps[idx - 1] : undefined;
  if (!need || completed.includes(need)) return null;
  return `Selesaikan ${STEP_LABELS[need]} terlebih dahulu.`;
}

/** Keeps rules only for the steps in use and points "after_step" at an earlier step in use. */
export function normalizeStepRules(steps: StepKey[], rules: StepRules): StepRules {
  const out: StepRules = {};
  steps.forEach((s, idx) => {
    const r = rules[s] ?? { mode: "after_previous" as const };
    if (r.mode === "after_step") {
      const afterIdx = r.after ? steps.indexOf(r.after) : -1;
      out[s] = afterIdx >= 0 && afterIdx < idx ? { mode: "after_step", after: r.after } : { mode: "after_previous" };
    } else {
      out[s] = { mode: r.mode };
    }
  });
  return out;
}

/** Percent of finished steps, mirrors public.record_progress(). */
export function progressPercent(steps: StepKey[], completed: string[]): number {
  if (!steps.length) return 0;
  const done = steps.filter((s) => completed.includes(s)).length;
  return Math.round((done / steps.length) * 10000) / 100;
}

/** Whether a new assessment attempt may start. */
export function canStartAttempt(maxAttempt: number | null, usedAttempts: number): boolean {
  return maxAttempt == null || usedAttempts < maxAttempt;
}

export function passed(score: number | null | undefined, passingGrade: number | null | undefined): boolean | null {
  if (score == null || passingGrade == null) return null;
  return score >= passingGrade;
}

export function formatScore(score: number | string | null | undefined): string {
  if (score == null || score === "") return "—";
  const n = Number(score);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** Accepts a URL or a pasted <iframe> embed code and returns a URL fit for an iframe/video. */
export function toEmbedUrl(input: string): string {
  const raw = input.trim();
  const iframe = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  const url = iframe?.[1] ?? raw;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

let lastMs = 0;
let seq = 0;
/** Time-ordered UUID (v7) so rows sorted by id keep the order they were created in. */
export function uuidv7(now: number = Date.now()): string {
  if (now <= lastMs) {
    seq += 1;
    now = lastMs;
  } else {
    lastMs = now;
    seq = 0;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ms = BigInt(now);
  for (let i = 0; i < 6; i++) bytes[i] = Number((ms >> BigInt(8 * (5 - i))) & BigInt(0xff));
  // 12-bit monotonic counter in rand_a
  bytes[6] = 0x70 | ((seq >> 8) & 0x0f);
  bytes[7] = seq & 0xff;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type SelfEvalItem = { id: string; text: string };

export function parseSelfEvalItems(items: unknown): SelfEvalItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it, i) =>
      typeof it === "string"
        ? { id: `item-${i}`, text: it }
        : it && typeof it === "object" && "text" in it
          ? { id: String((it as { id?: unknown }).id ?? `item-${i}`), text: String((it as { text: unknown }).text) }
          : null,
    )
    .filter((x): x is SelfEvalItem => !!x && x.text.trim() !== "");
}

export const LIKERT_LABELS = ["Sangat tidak setuju", "Tidak setuju", "Ragu-ragu", "Setuju", "Sangat setuju"] as const;

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    if (/violates foreign key/i.test(msg)) return "Data sudah dipakai mahasiswa sehingga tidak dapat dihapus.";
    if (/row-level security|Akses ditolak|permission denied/i.test(msg)) return "Akses ditolak.";
    return msg;
  }
  return "Terjadi kesalahan.";
}

// ---------------------------------------------------------------- learning rules

/** A step can be opened once every step before it is finished; Ringkasan opens when all are done. */
export function canOpenStep(steps: StepKey[], completed: string[], step: LearnStep, rules: StepRules = {}): boolean {
  if (step !== "ringkasan" && !steps.includes(step)) return false;
  return stepLock(steps, completed, rules, step) === null;
}

export function nextStep(steps: StepKey[], step: LearnStep): LearnStep | null {
  if (step === "ringkasan") return null;
  const idx = steps.indexOf(step);
  return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1]! : "ringkasan";
}

export function prevStep(steps: StepKey[], step: LearnStep): StepKey | null {
  if (step === "ringkasan") return steps[steps.length - 1] ?? null;
  const idx = steps.indexOf(step);
  return idx > 0 ? steps[idx - 1]! : null;
}

/** Seconds left for a timed attempt, or null when the assessment has no time limit. */
export function remainingSeconds(startedAt: string, durationMin: number | null, now: number = Date.now()): number | null {
  if (!durationMin) return null;
  const end = new Date(startedAt).getTime() + durationMin * 60_000;
  return Math.max(0, Math.floor((end - now) / 1000));
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Highest graded score among a student's attempts. */
export function bestScore(attempts: { status: AttemptStatus; total_score: number | null }[]): number | null {
  const scores = attempts.filter((a) => a.status === "graded" && a.total_score != null).map((a) => Number(a.total_score));
  return scores.length ? Math.max(...scores) : null;
}

export function learningStatus(
  progress: { percent: number; completed_at: string | null } | null | undefined,
): { label: string; tone: Tone } {
  if (!progress) return { label: "Belum mulai", tone: "neutral" };
  if (progress.completed_at || Number(progress.percent) >= 100) return { label: "Selesai", tone: "success" };
  return { label: "Sedang belajar", tone: "info" };
}

export type PublishCheckInput = {
  title: string;
  steps: StepKey[];
  materials: number;
  procedures: number;
  simulations: number;
  /** null = assessment not created yet */
  preTest: { questions: number; withoutKey: number } | null;
  postTest: { questions: number; withoutKey: number } | null;
  selfEvalItems: number | null;
};

/** What still blocks publishing. Only steps kept in the module's step order are checked. */
export function publishIssues(m: PublishCheckInput): string[] {
  const issues: string[] = [];
  const has = (s: StepKey) => m.steps.includes(s);
  if (!m.title.trim()) issues.push("Judul modul wajib diisi.");
  if (has("materi") && m.materials === 0) issues.push("Tambahkan minimal satu materi.");
  if (has("prosedur") && m.procedures === 0) issues.push("Tambahkan minimal satu langkah prosedur.");
  if (has("simulasi") && m.simulations === 0) issues.push("Tambahkan minimal satu simulasi.");
  for (const [key, a] of [
    ["pre_test", m.preTest],
    ["post_test", m.postTest],
  ] as const) {
    if (!has(key)) continue;
    const label = STEP_LABELS[key];
    if (!a) issues.push(`Buat ${label} terlebih dahulu.`);
    else if (a.questions === 0) issues.push(`Tambahkan minimal satu soal ${label}.`);
    else if (a.withoutKey > 0) issues.push(`${a.withoutKey} soal ${label} belum punya kunci jawaban.`);
  }
  if (has("self_evaluation") && !m.selfEvalItems) issues.push("Tambahkan minimal satu pernyataan self-evaluation.");
  return issues;
}

/** Objective questions need a correct option; essays are graded by the lecturer. */
export function questionHasKey(type: QuestionType, options: { is_correct: boolean }[]): boolean {
  if (type === "esai") return true;
  const correct = options.filter((o) => o.is_correct).length;
  if (type === "pg" || type === "benar_salah") return correct === 1;
  return correct >= 1;
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Per-module progress, best pre/post scores and resume step for the student's module list. */
export function summarizeStudentModules<
  M extends {
    step_order: unknown;
    step_rules?: unknown;
    learning_progress: { percent: number; current_step: string | null; completed_steps: unknown; last_accessed_at: string; completed_at: string | null }[];
    assessments: { type: AssessmentType; assessment_attempts: { status: AttemptStatus; total_score: number | null }[] }[];
  },
>(
  modules: M[],
) {
  return modules.map((m) => {
    const p = m.learning_progress[0] ?? null;
    const att = (t: AssessmentType) => m.assessments.find((a) => a.type === t)?.assessment_attempts ?? [];
    return {
      ...m,
      p,
      pct: Number(p?.percent ?? 0),
      status: learningStatus(p),
      pre: bestScore(att("pre_test")),
      post: bestScore(att("post_test")),
      waiting: [...att("pre_test"), ...att("post_test")].some((a) => a.status === "waiting_review"),
      step: resumeStep(parseSteps(m.step_order), parseCompleted(p?.completed_steps), p?.current_step, parseStepRules(m.step_rules)),
    };
  });
}


// ---------------------------------------------------------------- referensi terstruktur

export const REFERENCE_KINDS = ["Buku", "Jurnal Scopus", "Jurnal Nasional/Umum", "Lainnya"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];
export type ReferenceItem = { title: string; url: string; kind: ReferenceKind };

/** Reference materials store a JSON list in `content`. Older content (HTML) is returned as null. */
export function parseReferences(content: string | null | undefined): ReferenceItem[] | null {
  if (!content) return null;
  try {
    const v = JSON.parse(content);
    if (!Array.isArray(v)) return null;
    return v
      .filter((r) => r && typeof r.title === "string")
      .map((r) => ({ title: String(r.title), url: String(r.url ?? ""), kind: (REFERENCE_KINDS as readonly string[]).includes(r.kind) ? r.kind : "Lainnya" }));
  } catch {
    return null;
  }
}
