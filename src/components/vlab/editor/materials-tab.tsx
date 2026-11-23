import { FileText, Image as ImageIcon, Library, Loader2, MapPin, Pencil, Plus, Trash2, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, SectionCard, StepNotUsed, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { HotspotImage } from "@/components/vlab/hotspot-image";
import { MediaUpload } from "@/components/vlab/media-upload";
import { isEmptyHtml } from "@/components/vlab/rich-text";
import { RichTextEditor } from "@/components/vlab/rich-text-editor";
import { SortableList } from "@/components/vlab/sortable-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, MATERIAL_TYPE_LABELS, parseReferences, parseSteps, REFERENCE_KINDS, type MaterialType, type ReferenceItem } from "@/lib/vlab";

type Material = EditorModule["materials"][number];
type Asset = { id: string; file_url: string; type: string; mime_type: string | null } | null;

const TYPE_ICON: Record<MaterialType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  diagram: ImageIcon,
  pdf: FileText,
  reference: Library,
  hotspot: MapPin,
};
const NEEDS_FILE: MaterialType[] = ["image", "diagram", "pdf", "hotspot"];
// Jenis yang bisa dipilih dosen. Image dan diagram tetap terbaca untuk materi lama.
const CHOICES: MaterialType[] = ["text", "pdf", "hotspot", "reference"];
const DOCUMENT_ACCEPT = "application/pdf,.pdf,application/vnd.ms-powerpoint,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx";

export function MaterialsTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const [items, setItems] = useState(module.materials);
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  useEffect(() => setItems(module.materials), [module.materials]);

  async function reorder(next: Material[]) {
    setItems(next);
    const results = await Promise.all(
      next.map((m, i) => supabase.from("materials").update({ sort_order: i + 1 }).eq("id", m.id)),
    );
    const err = results.find((r) => r.error)?.error;
    if (err) toast.error(errorMessage(err));
    await refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Materi dihapus.");
    await refresh();
  }

  return (
    <SectionCard
      title="Materi"
      description="Teks, gambar, diagram, PDF, referensi, dan gambar hotspot interaktif. Geser untuk mengurutkan."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus /> Tambah materi
        </Button>
      }
    >
      <StepNotUsed used={parseSteps(module.step_order).includes("materi")} label="Materi" />
      {items.length === 0 ? (
        <EmptyState>Belum ada materi. Tambahkan materi pertama.</EmptyState>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          render={(m, i) => {
            const Icon = TYPE_ICON[m.type];
            return (
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <StatusBadge label={MATERIAL_TYPE_LABELS[m.type]} tone="info" />
                    {m.type === "hotspot" && <StatusBadge label={`${m.hotspots.length} titik`} tone="neutral" />}
                    {NEEDS_FILE.includes(m.type) && !m.media_assets && <StatusBadge label="File belum diunggah" tone="warning" />}
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Edit ${m.title}`} onClick={() => setEditing(m)}>
                  <Pencil />
                </Button>
                <ConfirmDelete label={m.title} onConfirm={() => remove(m.id)} />
              </div>
            );
          }}
        />
      )}
      {editing && (
        <MaterialDialog
          key={editing === "new" ? "new" : editing.id}
          module={module}
          material={editing === "new" ? null : editing}
          nextOrder={items.length + 1}
          onClose={() => setEditing(null)}
          onSaved={async (id, keepOpen) => {
            await refresh();
            if (!keepOpen) setEditing(null);
            else setEditing((cur) => (cur === "new" ? ({ id } as Material) : cur));
          }}
        />
      )}
    </SectionCard>
  );
}

export function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Hapus ${label}`} className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus “{label}”?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MaterialDialog({
  module,
  material: initial,
  nextOrder,
  onClose,
  onSaved,
}: {
  module: EditorModule;
  material: Material | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (id: string, keepOpen: boolean) => Promise<void>;
}) {
  // When a new hotspot material is saved, the parent swaps in a stub {id}; read the live row from the module.
  const material = initial ? (module.materials.find((m) => m.id === initial.id) ?? null) : null;
  const [title, setTitle] = useState(material?.title ?? "");
  const [type, setType] = useState<MaterialType>(material?.type ?? "text");
  const [content, setContent] = useState(material?.content ?? "");
  const [refs, setRefs] = useState<ReferenceItem[]>(parseReferences(material?.content) ?? [{ title: "", url: "", kind: "Buku" }]);
  const [asset, setAsset] = useState<Asset>(material?.media_assets ?? null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return void toast.error("Judul materi wajib diisi.");
    if (NEEDS_FILE.includes(type) && !asset) return void toast.error("Unggah file untuk materi ini.");
    if (type === "text" && isEmptyHtml(content)) return void toast.error("Isi materi wajib diisi.");
    if (type === "reference" && refs.some((r) => !r.title.trim() || !r.url.trim())) return void toast.error("Setiap referensi wajib memiliki judul dan tautan.");
    setBusy(true);
    const body = type === "reference" ? JSON.stringify(refs.map((r) => ({ ...r, title: r.title.trim(), url: r.url.trim() }))) : isEmptyHtml(content) ? null : content;
    const row = { title: title.trim(), type, content: body, media_asset_id: asset?.id ?? null };
    const res = material
      ? await supabase.from("materials").update(row).eq("id", material.id).select("id").single()
      : await supabase.from("materials").insert({ ...row, module_id: module.id, sort_order: nextOrder }).select("id").single();
    setBusy(false);
    if (res.error) return void toast.error(errorMessage(res.error));
    toast.success("Materi disimpan.");
    const keepOpen = !material && type === "hotspot";
    if (keepOpen) toast.info("Sekarang klik gambar untuk menambahkan titik hotspot.");
    await onSaved(res.data.id, keepOpen);
  }

  const accept = type === "pdf" ? DOCUMENT_ACCEPT : "image/*";
  const isNewHotspot = type === "hotspot" && !material;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? "Edit materi" : "Tambah materi"}</DialogTitle>
          <DialogDescription>
            {isNewHotspot ? "Langkah 1 dari 2: unggah gambar, lalu pilih Selanjutnya untuk menentukan titik." : "Semua file disimpan privat dan hanya dapat dibuka mahasiswa yang punya akses modul."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div className="space-y-2">
              <Label htmlFor="mat-title">Judul materi</Label>
              <Input id="mat-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={type} onValueChange={(v) => setType(v as MaterialType)} disabled={!!material}>
                <SelectTrigger aria-label="Jenis materi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHOICES.concat(CHOICES.includes(type) ? [] : [type]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {MATERIAL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {NEEDS_FILE.includes(type) && (
            <div className="space-y-2">
              <Label>{type === "pdf" ? "Dokumen" : "Gambar"}</Label>
              {type === "hotspot" && material && asset ? (
                <p className="text-xs text-muted-foreground">Gambar hotspot sudah terpasang. Kelola titiknya di bawah.</p>
              ) : (
                <MediaUpload value={asset} onChange={setAsset} accept={accept} label={type === "pdf" ? "Unggah dokumen (PDF, PPT, PPTX)" : "Unggah gambar"} />
              )}
            </div>
          )}
          {type === "reference" ? (
            <div className="space-y-2">
              <Label>Daftar referensi</Label>
              <ReferenceForm value={refs} onChange={setRefs} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{type === "text" ? "Isi materi" : "Keterangan (opsional)"}</Label>
              <RichTextEditor value={content} onChange={setContent} minHeight={type === "text" ? 220 : 100} />
            </div>
          )}
          {type === "hotspot" && material && (
            <HotspotEditor material={material} onChanged={() => onSaved(material.id, true)} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {isNewHotspot ? "Selanjutnya" : "Simpan materi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HotspotEditor({ material, onChanged }: { material: Material; onChanged: () => Promise<void> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const spot = material.hotspots.find((h) => h.id === selected);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    setTitle(spot?.title ?? "");
    setDesc(spot?.description ?? "");
  }, [spot?.id, spot?.title, spot?.description]);

  async function add(x: number, y: number) {
    const { data, error } = await supabase
      .from("hotspots")
      .insert({ material_id: material.id, pos_x: x, pos_y: y, title: `Titik ${material.hotspots.length + 1}` })
      .select("id")
      .single();
    if (error) return void toast.error(errorMessage(error));
    await onChanged();
    setSelected(data.id);
  }
  async function saveSpot() {
    if (!spot) return;
    if (!title.trim()) return void toast.error("Nama titik wajib diisi.");
    const { error } = await supabase
      .from("hotspots")
      .update({ title: title.trim(), description: desc.trim() || null })
      .eq("id", spot.id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Titik disimpan.");
    await onChanged();
  }
  async function removeSpot() {
    if (!spot) return;
    const { error } = await supabase.from("hotspots").delete().eq("id", spot.id);
    if (error) return void toast.error(errorMessage(error));
    setSelected(null);
    await onChanged();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
      <p className="text-sm font-medium">Titik hotspot</p>
      <p className="text-xs text-muted-foreground">Klik di gambar untuk menambah titik. Klik nomor untuk mengubah keterangannya.</p>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <HotspotImage
          path={material.media_assets?.file_url}
          alt={material.title}
          spots={material.hotspots}
          onPick={add}
          onSelect={setSelected}
          selectedId={selected}
        />
        <div className="space-y-3">
          {spot ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="hs-title">Nama titik</Label>
                <Input id="hs-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hs-desc">Penjelasan</Label>
                <Textarea id="hs-desc" rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSpot}>
                  Simpan titik
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={removeSpot}>
                  Hapus
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {material.hotspots.length ? "Pilih nomor titik untuk mengedit." : "Belum ada titik."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferenceForm({ value, onChange }: { value: ReferenceItem[]; onChange: (v: ReferenceItem[]) => void }) {
  const update = (i: number, patch: Partial<ReferenceItem>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {value.map((r, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Referensi {i + 1}</p>
            {value.length > 1 && (
              <Button variant="ghost" size="icon" aria-label={`Hapus referensi ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <div className="space-y-1.5">
              <Label htmlFor={`ref-title-${i}`}>Judul referensi</Label>
              <Input id={`ref-title-${i}`} value={r.title} maxLength={300} onChange={(e) => update(i, { title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis referensi</Label>
              <Select value={r.kind} onValueChange={(v) => update(i, { kind: v as ReferenceItem["kind"] })}>
                <SelectTrigger aria-label={`Jenis referensi ${i + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERENCE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`ref-url-${i}`}>Link / URL</Label>
            <Input id={`ref-url-${i}`} type="url" placeholder="https://" value={r.url} maxLength={2000} onChange={(e) => update(i, { url: e.target.value })} />
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={() => onChange([...value, { title: "", url: "", kind: "Buku" }])}>
        <Plus /> Tambah referensi
      </Button>
    </div>
  );
}
