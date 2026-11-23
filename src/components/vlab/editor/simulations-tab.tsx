import { useQuery } from "@tanstack/react-query";
import { BookMarked, Loader2, MonitorPlay, Pencil, Plus, Puzzle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDelete } from "@/components/vlab/editor/materials-tab";
import { EmptyState, SectionCard, StepNotUsed, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { EmbedView } from "@/components/vlab/media-view";
import { MediaUpload } from "@/components/vlab/media-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, isSafeHttpUrl, parseSteps, toEmbedUrl, type SimulationType } from "@/lib/vlab";
import { simulationCatalogQuery, type CatalogSimulation } from "@/lib/simulation-catalog";

type Simulation = EditorModule["simulations"][number];
type Asset = { id: string; file_url: string; type: string; mime_type: string | null } | null;
type DisplayMode = "embed" | "new_tab";

export function simulationDescription(config: unknown): string {
  return config && typeof config === "object" && "description" in config ? String((config as { description: unknown }).description ?? "") : "";
}

export function SimulationsTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const [editing, setEditing] = useState<Simulation | "new" | null>(null);
  const [picking, setPicking] = useState(false);

  async function remove(id: string) {
    const { error } = await supabase.from("simulations").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Simulasi dihapus.");
    await refresh();
  }

  return (
    <SectionCard
      title="Simulasi"
      description="Ambil simulasi dari katalog pusat, atau tambahkan tautan eksternal (PhET, H5P, video). Geser untuk mengurutkan."
      actions={
        <>
          <Button variant="outline" onClick={() => setPicking(true)}>
            <BookMarked /> Ambil dari katalog
          </Button>
          <Button onClick={() => setEditing("new")}>
            <Plus /> Tambah simulasi
          </Button>
        </>
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
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusBadge label={s.type === "video" ? "Video" : "Interaktif"} tone="info" />
                  <StatusBadge label={s.catalog_id ? "Dari katalog" : "Eksternal"} tone="neutral" />
                  <StatusBadge label={s.display_mode === "new_tab" ? "Tab baru" : "Tampil di halaman"} tone="neutral" />
                </div>
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
      {picking && (
        <CatalogPicker
          moduleId={module.id}
          usedIds={module.simulations.map((s) => s.catalog_id).filter((x): x is string => !!x)}
          onClose={() => setPicking(false)}
          onAdded={async () => {
            await refresh();
          }}
        />
      )}
    </SectionCard>
  );
}

/** Dosen hanya membaca katalog aktif. "Gunakan di Modul" menyalin simulasi ke modul ini. */
function CatalogPicker({
  moduleId,
  usedIds,
  onClose,
  onAdded,
}: {
  moduleId: string;
  usedIds: string[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const { data, isLoading } = useQuery(simulationCatalogQuery);
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = (data ?? []).filter((c) => c.is_active);

  async function use(c: CatalogSimulation) {
    setBusyId(c.id);
    const { error } = await supabase.from("simulations").insert({
      module_id: moduleId,
      catalog_id: c.id,
      title: c.title,
      type: c.type,
      external_url: c.external_url,
      display_mode: c.display_mode,
      config: c.description ? { description: c.description } : null,
    });
    setBusyId(null);
    if (error) return void toast.error(errorMessage(error));
    toast.success(`${c.title} ditambahkan ke modul.`);
    await onAdded();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Katalog simulasi</DialogTitle>
          <DialogDescription>Simulasi yang disiapkan Super Admin. Setelah digunakan, judul dan petunjuknya bisa diubah untuk modul ini.</DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {data && active.length === 0 && <EmptyState>Belum ada simulasi di katalog.</EmptyState>}
        <ul className="space-y-2">
          {active.map((c) => {
            const used = usedIds.includes(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.type === "video" ? "Video" : "Interaktif"} · {c.display_mode === "new_tab" ? "Buka di tab baru" : "Tampil di halaman"}
                  </p>
                  {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <Button size="sm" variant="outline" disabled={used || busyId === c.id} onClick={() => use(c)}>
                  {busyId === c.id && <Loader2 className="animate-spin" />}
                  {used ? "Sudah dipakai" : "Gunakan di Modul"}
                </Button>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [displayMode, setDisplayMode] = useState<DisplayMode>(simulation?.display_mode === "new_tab" ? "new_tab" : "embed");
  const [busy, setBusy] = useState(false);
  const useFile = type === "video" && source === "file" && !simulation?.catalog_id;
  const embed = url.trim() ? toEmbedUrl(url) : "";
  const fromCatalog = !!simulation?.catalog_id;

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
      display_mode: displayMode,
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
          {fromCatalog && (
            <DialogDescription>Simulasi ini disalin dari katalog. Perubahan di sini hanya berlaku untuk modul ini.</DialogDescription>
          )}
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
          {type === "video" && !fromCatalog && (
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
            <Label>Tampilan untuk mahasiswa</Label>
            <RadioGroup value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="embed" /> Tampil di halaman modul
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="new_tab" /> Buka di tab baru (tombol)
              </label>
            </RadioGroup>
          </div>
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
