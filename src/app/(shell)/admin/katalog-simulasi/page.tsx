"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmbedView } from "@/components/vlab/media-view";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { type CatalogSimulation, simulationCatalogQuery } from "@/lib/simulation-catalog";
import { errorMessage, isSafeHttpUrl, toEmbedUrl, type SimulationType } from "@/lib/vlab";

export default function SimulationCatalogPage() {
  const { data, isLoading } = useQuery(simulationCatalogQuery);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CatalogSimulation | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CatalogSimulation | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: simulationCatalogQuery.queryKey });
  }

  async function toggleActive(c: CatalogSimulation) {
    const { error } = await supabase
      .from("simulation_catalog")
      .update({ is_active: !c.is_active, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) return void toast.error(errorMessage(error));
    toast.success(c.is_active ? "Simulasi dinonaktifkan. Dosen tidak bisa menambahkannya lagi." : "Simulasi diaktifkan.");
    await refresh();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    const { error } = await supabase.from("simulation_catalog").delete().eq("id", toDelete.id);
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success(`"${toDelete.title}" dihapus dari katalog. Salinan di modul tetap ada.`);
    setToDelete(null);
    await refresh();
  }

  return (
    <div>
      <PageHeader
        title="Katalog Simulasi"
        description="Simulasi pusat yang bisa dipakai dosen di modul mereka. Nonaktifkan untuk menyembunyikan dari dosen tanpa menghapus."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Tambah simulasi
          </Button>
        }
      />
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Tampilan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            )}
            {data && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Belum ada simulasi di katalog.
                </TableCell>
              </TableRow>
            )}
            {data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c.type === "video" ? "Video" : "Interaktif"}</TableCell>
                <TableCell>{c.display_mode === "new_tab" ? "Tab baru" : "Tampil di halaman"}</TableCell>
                <TableCell>
                  <StatusBadge label={c.is_active ? "Aktif" : "Nonaktif"} tone={c.is_active ? "success" : "neutral"} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${c.title}`} onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`${c.is_active ? "Nonaktifkan" : "Aktifkan"} ${c.title}`} onClick={() => toggleActive(c)}>
                      {c.is_active ? <PowerOff /> : <Power />}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Hapus ${c.title}`} className="text-destructive" onClick={() => setToDelete(c)}>
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {open && (
        <CatalogForm
          key={editing?.id ?? "new"}
          item={editing}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await refresh();
          }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dari katalog?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.title} akan dihapus dari katalog. Modul yang sudah memakai simulasi ini tetap memilikinya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(e) => (e.preventDefault(), confirmDelete())}
            >
              {busy && <Loader2 className="animate-spin" />} Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogForm({
  item,
  onClose,
  onSaved,
}: {
  item: CatalogSimulation | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState<SimulationType>(item?.type ?? "interactive");
  const [url, setUrl] = useState(item?.external_url ?? "");
  const [displayMode, setDisplayMode] = useState<"embed" | "new_tab">(item?.display_mode === "new_tab" ? "new_tab" : "embed");
  const [description, setDescription] = useState(item?.description ?? "");
  const [busy, setBusy] = useState(false);
  const embed = url.trim() ? toEmbedUrl(url) : "";

  async function save() {
    if (!title.trim()) return void toast.error("Judul wajib diisi.");
    if (!isSafeHttpUrl(embed)) return void toast.error("Masukkan tautan https atau kode embed yang valid.");
    setBusy(true);
    const row = {
      title: title.trim(),
      type,
      external_url: embed,
      display_mode: displayMode,
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = item
      ? await supabase.from("simulation_catalog").update(row).eq("id", item.id)
      : await supabase.from("simulation_catalog").insert(row);
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Katalog disimpan.");
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit simulasi katalog" : "Tambah simulasi katalog"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-title">Judul</Label>
            <Input id="cat-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
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
          <div className="space-y-2">
            <Label htmlFor="cat-url">Tautan atau kode embed</Label>
            <Textarea
              id="cat-url"
              rows={3}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://phet.colorado.edu/… atau kode <iframe>"
            />
            {embed && isSafeHttpUrl(embed) && <EmbedView url={embed} title={title || "Pratinjau"} />}
          </div>
          <div className="space-y-2">
            <Label>Tampilan untuk mahasiswa</Label>
            <RadioGroup value={displayMode} onValueChange={(v) => setDisplayMode(v as "embed" | "new_tab")} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="embed" /> Tampil di halaman modul
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="new_tab" /> Buka di tab baru (tombol)
              </label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Petunjuk default (opsional)</Label>
            <Textarea id="cat-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
