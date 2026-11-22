import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionCard, StepNotUsed, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { SortableList } from "@/components/vlab/sortable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, LIKERT_LABELS, parseSelfEvalItems, parseSteps, uuidv7 } from "@/lib/vlab";

export function SelfEvalTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const existing = module.self_evaluations;
  const [title, setTitle] = useState(existing?.title ?? "Refleksi diri");
  const [items, setItems] = useState(() => {
    const parsed = parseSelfEvalItems(existing?.items);
    return parsed.length ? parsed : [{ id: uuidv7(), text: "" }];
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    const clean = items.map((i) => ({ id: i.id, text: i.text.trim() })).filter((i) => i.text);
    if (!title.trim()) return void toast.error("Judul wajib diisi.");
    if (!clean.length) return void toast.error("Tambahkan minimal satu pernyataan.");
    setBusy(true);
    const { error } = await supabase
      .from("self_evaluations")
      .upsert({ module_id: module.id, title: title.trim(), items: clean }, { onConflict: "module_id" });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Self-evaluation disimpan.");
    await refresh();
  }

  return (
    <SectionCard
      title="Self-evaluation"
      description={`Mahasiswa menilai diri untuk tiap pernyataan dengan skala 1–5 (${LIKERT_LABELS[0]} sampai ${LIKERT_LABELS[4]}).`}
    >
      <StepNotUsed used={parseSteps(module.step_order).includes("self_evaluation")} label="Self-evaluation" />
      <div className="space-y-4">
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="se-title">Judul</Label>
          <Input id="se-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label>Pernyataan</Label>
          <SortableList
            items={items}
            onReorder={setItems}
            render={(it, i) => (
              <div className="flex items-center gap-2">
                <span className="w-6 text-sm text-muted-foreground">{i + 1}.</span>
                <Input
                  value={it.text}
                  onChange={(e) => setItems((all) => all.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
                  placeholder="mis. Saya mampu mengukur tekanan darah dengan benar"
                  maxLength={500}
                  aria-label={`Pernyataan ${i + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus pernyataan ${i + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems((all) => all.filter((x) => x.id !== it.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          />
          <Button variant="outline" size="sm" onClick={() => setItems((all) => [...all, { id: uuidv7(), text: "" }])}>
            <Plus /> Tambah pernyataan
          </Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Simpan self-evaluation
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
