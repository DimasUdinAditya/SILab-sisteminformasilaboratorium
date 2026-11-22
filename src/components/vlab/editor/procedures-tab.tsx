import { Loader2, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDelete } from "@/components/vlab/editor/materials-tab";
import { EmptyState, SectionCard, StepNotUsed, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { MediaUpload } from "@/components/vlab/media-upload";
import { isEmptyHtml } from "@/components/vlab/rich-text";
import { RichTextEditor } from "@/components/vlab/rich-text-editor";
import { SortableList } from "@/components/vlab/sortable-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, parseSteps } from "@/lib/vlab";

type Procedure = EditorModule["procedures"][number];
type Asset = { id: string; file_url: string; type: string; mime_type: string | null } | null;

export function ProceduresTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const [items, setItems] = useState(module.procedures);
  const [editing, setEditing] = useState<Procedure | "new" | null>(null);
  useEffect(() => setItems(module.procedures), [module.procedures]);

  async function reorder(next: Procedure[]) {
    setItems(next);
    const results = await Promise.all(next.map((p, i) => supabase.from("procedures").update({ step_no: i + 1 }).eq("id", p.id)));
    const err = results.find((r) => r.error)?.error;
    if (err) toast.error(errorMessage(err));
    await refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("procedures").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    const rest = items.filter((p) => p.id !== id);
    await Promise.all(rest.map((p, i) => supabase.from("procedures").update({ step_no: i + 1 }).eq("id", p.id)));
    toast.success("Langkah dihapus.");
    await refresh();
  }

  return (
    <SectionCard
      title="Prosedur"
      description="Langkah kerja praktikum secara berurutan. Geser untuk mengubah urutan."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus /> Tambah langkah
        </Button>
      }
    >
      <StepNotUsed used={parseSteps(module.step_order).includes("prosedur")} label="Prosedur" />
      {items.length === 0 ? (
        <EmptyState>Belum ada langkah prosedur.</EmptyState>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          render={(p, i) => (
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                {p.media_assets && <StatusBadge label={p.media_assets.type === "video" ? "Ada video" : "Ada gambar"} tone="info" className="mt-1" />}
              </div>
              <Button variant="ghost" size="icon" aria-label={`Edit ${p.title}`} onClick={() => setEditing(p)}>
                <Pencil />
              </Button>
              <ConfirmDelete label={p.title} onConfirm={() => remove(p.id)} />
            </div>
          )}
        />
      )}
      {editing && (
        <ProcedureDialog
          moduleId={module.id}
          procedure={editing === "new" ? null : editing}
          nextNo={items.length + 1}
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

function ProcedureDialog({
  moduleId,
  procedure,
  nextNo,
  onClose,
  onSaved,
}: {
  moduleId: string;
  procedure: Procedure | null;
  nextNo: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(procedure?.title ?? "");
  const [instruction, setInstruction] = useState(procedure?.instruction ?? "");
  const [asset, setAsset] = useState<Asset>(procedure?.media_assets ?? null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return void toast.error("Judul langkah wajib diisi.");
    setBusy(true);
    const row = { title: title.trim(), instruction: isEmptyHtml(instruction) ? null : instruction, media_asset_id: asset?.id ?? null };
    const { error } = procedure
      ? await supabase.from("procedures").update(row).eq("id", procedure.id)
      : await supabase.from("procedures").insert({ ...row, module_id: moduleId, step_no: nextNo });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Langkah disimpan.");
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{procedure ? `Edit langkah ${procedure.step_no}` : `Langkah ${nextNo}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pr-title">Judul langkah</Label>
            <Input id="pr-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="mis. Cuci tangan 6 langkah" />
          </div>
          <div className="space-y-2">
            <Label>Instruksi</Label>
            <RichTextEditor value={instruction} onChange={setInstruction} />
          </div>
          <div className="space-y-2">
            <Label>Gambar atau video pendukung (opsional)</Label>
            <MediaUpload value={asset} onChange={setAsset} accept="image/*,video/*" label="Unggah gambar/video" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Simpan langkah
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
