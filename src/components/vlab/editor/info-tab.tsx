import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionCard, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { SortableList } from "@/components/vlab/sortable-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_STEPS,
  errorMessage,
  normalizeStepRules,
  parseStepRules,
  parseSteps,
  STEP_LABELS,
  type StepKey,
  type StepRule,
  type StepRules,
  type UnlockMode,
  UNLOCK_MODE_LABELS,
} from "@/lib/vlab";

const STEP_HINT: Record<StepKey, string> = {
  pre_test: "Tes awal sebelum belajar",
  materi: "Teks, gambar, PDF, referensi, gambar hotspot",
  prosedur: "Langkah kerja praktikum",
  simulasi: "Video atau simulasi interaktif",
  post_test: "Tes akhir setelah belajar",
  self_evaluation: "Refleksi diri mahasiswa",
};

export function InfoTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description ?? "");
  const used = parseSteps(module.step_order);
  const [steps, setSteps] = useState(() => [
    ...used.map((s) => ({ id: s, on: true })),
    ...DEFAULT_STEPS.filter((s) => !used.includes(s)).map((s) => ({ id: s, on: false })),
  ]);
  const [rules, setRules] = useState<StepRules>(() => parseStepRules(module.step_rules));
  const [busy, setBusy] = useState(false);

  /** Steps in use that come before a given step, in learning order. */
  const earlierOf = (index: number) => steps.slice(0, index).filter((x) => x.on).map((x) => x.id);

  function setRule(id: StepKey, mode: UnlockMode, after?: StepKey) {
    setRules((r) => ({ ...r, [id]: mode === "after_step" && after ? { mode, after } : { mode } }));
  }

  function requirementText(id: StepKey, rule: StepRule, earlier: StepKey[]): string {
    if (rule.mode === "always") return "Terbuka sejak awal, tanpa syarat.";
    if (rule.mode === "after_step") {
      return rule.after ? `Terkunci sampai ${STEP_LABELS[rule.after]} selesai.` : "Pilih tahap yang harus diselesaikan dulu.";
    }
    const prev = earlier[earlier.length - 1];
    return prev ? `Terkunci sampai ${STEP_LABELS[prev]} selesai.` : "Terbuka sejak awal.";
  }

  async function save() {
    if (!title.trim()) return void toast.error("Judul modul wajib diisi.");
    const order = steps.filter((s) => s.on).map((s) => s.id);
    if (order.length === 0) return void toast.error("Pilih minimal satu tahap belajar.");
    setBusy(true);
    const { error } = await supabase
      .from("modules")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        step_order: order,
        step_rules: normalizeStepRules(order, rules),
        updated_at: new Date().toISOString(),
      })
      .eq("id", module.id);
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success(module.status === "Draft" ? "Draft disimpan." : "Perubahan disimpan.");
    await refresh(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_460px]">
      <SectionCard title="Informasi modul" description="Judul dan deskripsi tampil di katalog mahasiswa.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="info-title">Judul modul</Label>
            <Input id="info-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="info-desc">Deskripsi</Label>
            <Textarea id="info-desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
          </div>
          <div className="text-sm text-muted-foreground">
            Mata kuliah: <span className="font-medium text-foreground">{module.courses?.code} · {module.courses?.name}</span>
          </div>
        </div>
      </SectionCard>
      <SectionCard
        title="Urutan & aturan buka tahap"
        description="Geser untuk mengubah urutan. Atur kapan tiap tahap terbuka untuk mahasiswa. Ringkasan selalu di akhir."
      >
        <SortableList
          items={steps}
          onReorder={setSteps}
          render={(s, i) => {
            const earlier = earlierOf(i);
            const rule: StepRule = rules[s.id] ?? { mode: "after_previous" };
            return (
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={s.on}
                    onCheckedChange={(v) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, on: v === true } : x)))}
                    aria-label={`Pakai tahap ${STEP_LABELS[s.id]}`}
                  />
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={s.on ? "font-medium" : "font-medium text-muted-foreground line-through"}>{STEP_LABELS[s.id]}</span>
                    <span className="block text-xs text-muted-foreground">{STEP_HINT[s.id]}</span>
                  </span>
                </label>
                {s.on && (
                  <div className="ml-9 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={rule.mode}
                        onValueChange={(v) => setRule(s.id, v as UnlockMode, earlier[earlier.length - 1])}
                      >
                        <SelectTrigger className="h-8 w-auto min-w-[200px]" aria-label={`Aturan buka ${STEP_LABELS[s.id]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(UNLOCK_MODE_LABELS) as UnlockMode[]).map((m) => (
                            <SelectItem key={m} value={m} disabled={m === "after_step" && earlier.length === 0}>
                              {UNLOCK_MODE_LABELS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rule.mode === "after_step" && earlier.length > 0 && (
                        <Select value={rule.after ?? ""} onValueChange={(v) => setRule(s.id, "after_step", v as StepKey)}>
                          <SelectTrigger className="h-8 w-auto min-w-[160px]" aria-label={`Tahap pemicu ${STEP_LABELS[s.id]}`}>
                            <SelectValue placeholder="Pilih tahap" />
                          </SelectTrigger>
                          <SelectContent>
                            {earlier.map((e) => (
                              <SelectItem key={e} value={e}>
                                {STEP_LABELS[e]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{requirementText(s.id, rule, earlier)}</p>
                  </div>
                )}
              </div>
            );
          }}
        />
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Ringkasan · ditampilkan otomatis setelah semua tahap selesai</p>
      </SectionCard>
      <div className="xl:col-span-2 flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {module.status === "Draft" ? "Simpan Draft" : "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}
