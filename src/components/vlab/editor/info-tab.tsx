import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionCard, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { SortableList } from "@/components/vlab/sortable-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STEPS, errorMessage, parseSteps, STEP_LABELS, type StepKey } from "@/lib/vlab";

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
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return void toast.error("Judul modul wajib diisi.");
    const order = steps.filter((s) => s.on).map((s) => s.id);
    if (order.length === 0) return void toast.error("Pilih minimal satu tahap belajar.");
    setBusy(true);
    const { error } = await supabase
      .from("modules")
      .update({ title: title.trim(), description: description.trim() || null, step_order: order, updated_at: new Date().toISOString() })
      .eq("id", module.id);
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success(module.status === "Draft" ? "Draft disimpan." : "Perubahan disimpan.");
    await refresh(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
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
      <SectionCard title="Urutan belajar" description="Geser untuk mengubah urutan. Hilangkan centang untuk tahap yang tidak dipakai. Ringkasan selalu di akhir.">
        <SortableList
          items={steps}
          onReorder={setSteps}
          render={(s, i) => (
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
          )}
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
