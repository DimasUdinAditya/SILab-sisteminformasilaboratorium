import { Loader2, MonitorPlay, Pencil, Plus, Puzzle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDelete } from "@/components/vlab/editor/materials-tab";
import { EmptyState, SectionCard, StepNotUsed, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { EmbedView } from "@/components/vlab/media-view";
import { MediaUpload } from "@/components/vlab/media-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, isSafeHttpUrl, parseSteps, toEmbedUrl, type SimulationType } from "@/lib/vlab";

type Simulation = EditorModule["simulations"][number];
type Asset = { id: string; file_url: string; type: string; mime_type: string | null } | null;

export function simulationDescription(config: unknown): string {
  return config && typeof config === "object" && "description" in config ? String((config as { description: unknown }).description ?? "") : "";
}

export function SimulationsTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const [editing, setEditing] = useState<Simulation | "new" | null>(null);

  async function remove(id: string) {
    const { error } = await supabase.from("simulations").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Simulasi dihapus.");
    await refresh();
  }

  return (
    <SectionCard
      title="Simulasi"
      description="Video praktikum atau simulasi interaktif (mis. PhET, H5P) lewat tautan atau kode embed."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus /> Tambah simulasi
        </Button>
      }
    >
      <StepNotUsed used={parseSteps(module.step_order).includes("simulasi")} label="Simulasi" />
      {module.simulations.length === 0 ? (
        <EmptyState>Belum ada simulasi.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {module.simulations.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {s.type === "video" ? <MonitorPlay className="size-4" /> : <Puzzle className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.title}</p>
                <StatusBadge label={s.type === "video" ? "Video" : "Interaktif"} tone="info" className="mt-1" />
              </div>
              <Button variant="ghost" size="icon" aria-label={`Edit ${s.title}`} onClick={() => setEditing(s)}>
                <Pencil />
              </Button>
              <ConfirmDelete label={s.title} onConfirm={() => remove(s.id)} />
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <SimulationDialog
          moduleId={module.id}
          simulation={editing === "new" ? null : editing}
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

function SimulationDialog({
  moduleId,
  simulation,
  onClose,
  onSaved,
}: {
  moduleId: string;
  simulation: Simulation | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(simulation?.title ?? "");
  const [type, setType] = useState<SimulationType>(simulation?.type ?? "video");
  const [source, setSource] = useState<"link" | "file">(simulation?.media_assets ? "file" : "link");
  const [url, setUrl] = useState(simulation?.external_url ?? "");
  const [asset, setAsset] = useState<Asset>(simulation?.media_assets ?? null);
  const [description, setDescription] = useState(simulationDescription(simulation?.config));
  const [busy, setBusy] = useState(false);
  const useFile = type === "video" && source === "file";
  const embed = url.trim() ? toEmbedUrl(url) : "";

  async function save() {
    if (!title.trim()) return void toast.error("Judul simulasi wajib diisi.");
    if (useFile && !asset) return void toast.error("Unggah file video.");
    if (!useFile && !isSafeHttpUrl(embed)) return void toast.error("Masukkan tautan https atau kode embed yang valid.");
    setBusy(true);
    const row = {
      title: title.trim(),
      type,
      external_url: useFile ? null : embed,
      media_asset_id: useFile ? (asset?.id ?? null) : null,
      config: description.trim() ? { description: description.trim() } : null,
    };
    const { error } = simulation
      ? await supabase.from("simulations").update(row).eq("id", simulation.id)
      : await supabase.from("simulations").insert({ ...row, module_id: moduleId });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Simulasi disimpan.");
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{simulation ? "Edit simulasi" : "Tambah simulasi"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sim-title">Judul</Label>
            <Input id="sim-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Jenis</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as SimulationType)} className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="video" /> Video
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="interactive" /> Simulasi interaktif
              </label>
            </RadioGroup>
          </div>
          {type === "video" && (
            <RadioGroup value={source} onValueChange={(v) => setSource(v as "link" | "file")} className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="link" /> Tautan (YouTube/Vimeo)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="file" /> Unggah file video
              </label>
            </RadioGroup>
          )}
          {useFile ? (
            <MediaUpload value={asset} onChange={setAsset} accept="video/*" label="Unggah video" />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sim-url">Tautan atau kode embed</Label>
              <Textarea
                id="sim-url"
                rows={3}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={type === "video" ? "https://www.youtube.com/watch?v=…" : '<iframe src="https://phet.colorado.edu/…"></iframe>'}
              />
              {embed && isSafeHttpUrl(embed) && <EmbedView url={embed} title={title || "Pratinjau"} />}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="sim-desc">Petunjuk untuk mahasiswa (opsional)</Label>
            <Textarea id="sim-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Simpan simulasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
