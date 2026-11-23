"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PhotoField } from "@/components/labman/photo-field";
import { uploadLabFile } from "@/lib/lab-files";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, labError, STOCK_MOVEMENT_LABELS, type StockMovementType } from "@/lib/labman";
import { categoriesQuery, stockMovementsQuery, type CatalogConsumable, type CatalogEquipment } from "@/lib/labman-queries";

type LabOpt = { id: string; name: string };
export const CONDITIONS = ["Baik", "Rusak Ringan", "Rusak Berat", "Dalam Perbaikan"];

function LabSelect({ labs, value, onChange }: { labs: LabOpt[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Laboratorium</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Laboratorium">
          <SelectValue placeholder="Pilih laboratorium" />
        </SelectTrigger>
        <SelectContent>
          {labs.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EquipmentDialog({
  open,
  onOpenChange,
  item,
  labs,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: CatalogEquipment | null;
  labs: LabOpt[];
}) {
  const qc = useQueryClient();
  const { data: cats } = useQuery(categoriesQuery);
  const [f, setF] = useState({ lab: "", category: "", code: "", name: "", qty: "1", condition: "Baik", calib: false, description: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open)
      setF({
        lab: item?.laboratory_id ?? labs[0]?.id ?? "",
        category: item?.category_id ?? "",
        code: item?.code ?? "",
        name: item?.name ?? "",
        qty: String(item?.qty_total ?? 1),
        condition: item?.condition ?? "Baik",
        calib: item?.requires_calibration ?? false,
        description: item?.description ?? "",
      });
    if (open) setPhoto(null);
  }, [open, item, labs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(f.qty);
    if (!f.lab || !f.category) return void toast.error("Pilih laboratorium dan kategori.");
    if (!f.code.trim() || !f.name.trim()) return void toast.error("Kode dan nama alat wajib diisi.");
    if (!Number.isInteger(qty) || qty < 0) return void toast.error("Jumlah harus bilangan bulat ≥ 0.");
    if (!f.description.trim()) return void toast.error("Deskripsi alat wajib diisi.");
    if (!photo && !item?.photo_url) return void toast.error("Foto alat wajib diunggah.");
    setBusy(true);
    let photoPath: string | undefined;
    try {
      if (photo) photoPath = await uploadLabFile("equipment-photos", item ? item.laboratory_id : f.lab, photo);
    } catch (err) {
      setBusy(false);
      return void toast.error(labError(err));
    }
    const row = {
      category_id: f.category, code: f.code.trim(), name: f.name.trim(), qty_total: qty, condition: f.condition,
      requires_calibration: f.calib, description: f.description.trim(), ...(photoPath ? { photo_url: photoPath } : {}),
    };
    const { error } = item
      ? await supabase.from("equipment").update(row).eq("id", item.id)
      : await supabase.from("equipment").insert({ ...row, laboratory_id: f.lab });
    setBusy(false);
    if (error) return void toast.error(labError(error));
    toast.success("Alat disimpan.");
    await qc.invalidateQueries({ queryKey: ["labman"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{item ? "Ubah alat" : "Tambah alat"}</DialogTitle>
          </DialogHeader>
          {!item && labs.length > 1 && <LabSelect labs={labs} value={f.lab} onChange={(lab) => setF({ ...f, lab })} />}
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="eq-code">Kode</Label>
              <Input id="eq-code" value={f.code} maxLength={30} placeholder="ALT-010" onChange={(e) => setF({ ...f, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-name">Nama alat</Label>
              <Input id="eq-name" value={f.name} maxLength={150} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={f.category} onValueChange={(category) => setF({ ...f, category })}>
              <SelectTrigger aria-label="Kategori">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {cats?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cats?.length === 0 && <p className="text-xs text-destructive">Buat kategori dulu di tab Kategori.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eq-qty">Jumlah total</Label>
              <Input id="eq-qty" type="number" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
              {item && <p className="text-xs text-muted-foreground">Sedang dipinjam: {item.qty_total - item.qty_available}</p>}
            </div>
            <div className="space-y-2">
              <Label>Kondisi</Label>
              <Select value={f.condition} onValueChange={(condition) => setF({ ...f, condition })}>
                <SelectTrigger aria-label="Kondisi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-desc">Deskripsi *</Label>
            <Textarea id="eq-desc" required maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <PhotoField file={photo} onChange={setPhoto} label="Foto alat *" />
          {item?.photo_url && !photo && <p className="text-xs text-muted-foreground">Foto saat ini sudah tersimpan. Pilih file baru untuk menggantinya.</p>}
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Wajib kalibrasi</span>
              <span className="text-xs text-muted-foreground">Alat tidak bisa dipinjam jika kalibrasinya kedaluwarsa.</span>
            </span>
            <Switch checked={f.calib} onCheckedChange={(calib) => setF({ ...f, calib })} aria-label="Wajib kalibrasi" />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConsumableDialog({
  open,
  onOpenChange,
  item,
  labs,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: CatalogConsumable | null;
  labs: LabOpt[];
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({ lab: "", code: "", name: "", unit: "", stock: "0", min: "0", description: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open)
      setF({
        lab: item?.laboratory_id ?? labs[0]?.id ?? "",
        code: item?.code ?? "",
        name: item?.name ?? "",
        unit: item?.unit ?? "",
        stock: String(item?.stock ?? 0),
        min: String(item?.min_stock ?? 0),
        description: item?.description ?? "",
      });
    if (open) setPhoto(null);
  }, [open, item, labs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const stock = Number(f.stock);
    const min = Number(f.min);
    if (!f.lab) return void toast.error("Pilih laboratorium.");
    if (!f.code.trim()) return void toast.error("ID/Kode bahan wajib diisi.");
    if (!f.name.trim() || !f.unit.trim()) return void toast.error("Nama dan satuan wajib diisi.");
    if (![stock, min].every((n) => Number.isInteger(n) && n >= 0)) return void toast.error("Stok harus bilangan bulat ≥ 0.");
    if (!f.description.trim()) return void toast.error("Deskripsi bahan wajib diisi.");
    if (!photo && !item?.photo_url) return void toast.error("Foto bahan wajib diunggah.");
    setBusy(true);
    let photoPath: string | undefined;
    try {
      if (photo) photoPath = await uploadLabFile("equipment-photos", item ? item.laboratory_id : f.lab, photo);
    } catch (err) {
      setBusy(false);
      return void toast.error(labError(err));
    }
    const extra = { code: f.code.trim(), description: f.description.trim(), ...(photoPath ? { photo_url: photoPath } : {}) };
    const { error } = item
      ? await supabase.from("consumables").update({ name: f.name.trim(), unit: f.unit.trim(), min_stock: min, ...extra }).eq("id", item.id)
      : await supabase.from("consumables").insert({ laboratory_id: f.lab, name: f.name.trim(), unit: f.unit.trim(), stock, min_stock: min, ...extra });
    setBusy(false);
    if (error) return void toast.error(labError(error));
    toast.success("Bahan disimpan.");
    await qc.invalidateQueries({ queryKey: ["labman"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{item ? "Ubah bahan habis pakai" : "Tambah bahan habis pakai"}</DialogTitle>
          </DialogHeader>
          {!item && labs.length > 1 && <LabSelect labs={labs} value={f.lab} onChange={(lab) => setF({ ...f, lab })} />}
          <div className="space-y-2">
            <Label htmlFor="co-code">ID/Kode *</Label>
            <Input id="co-code" value={f.code} maxLength={30} placeholder="ALKG-01" onChange={(e) => setF({ ...f, code: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="co-name">Nama bahan</Label>
              <Input id="co-name" value={f.name} maxLength={150} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-unit">Satuan</Label>
              <Input id="co-unit" value={f.unit} maxLength={30} placeholder="pcs" onChange={(e) => setF({ ...f, unit: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {!item && (
              <div className="space-y-2">
                <Label htmlFor="co-stock">Stok awal</Label>
                <Input id="co-stock" type="number" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="co-min">Stok minimum</Label>
              <Input id="co-min" type="number" min={0} value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="co-desc">Deskripsi *</Label>
            <Textarea id="co-desc" maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <PhotoField file={photo} onChange={setPhoto} label="Foto bahan *" />
          {item?.photo_url && !photo && <p className="text-xs text-muted-foreground">Foto saat ini sudah tersimpan. Pilih file baru untuk menggantinya.</p>}
          {item && <p className="text-xs text-muted-foreground">Ubah jumlah stok lewat tombol Kelola Stok agar tercatat di riwayat.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StockDialog({ item, onClose }: { item: CatalogConsumable | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: moves } = useQuery({ ...stockMovementsQuery(item?.id ?? ""), enabled: !!item });
  const [type, setType] = useState<StockMovementType>("in");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (item) {
      setType("in");
      setQty("");
    }
  }, [item]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const n = Number(qty);
    if (!qty || !Number.isInteger(n) || n < 0 || (type !== "adjustment" && n === 0)) return void toast.error("Isi jumlah yang valid.");
    setBusy(true);
    const { data, error } = await supabase.rpc("adjust_stock", { _consumable_id: item.id, _type: type, _qty: n });
    setBusy(false);
    if (error) return void toast.error(labError(error));
    toast.success(`Stok ${item.name} sekarang ${data} ${item.unit}.`);
    setQty("");
    await qc.invalidateQueries({ queryKey: ["labman"] });
  }

  const current = item ? item.stock : 0;
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola stok · {item?.name}</DialogTitle>
          <DialogDescription>
            Stok saat ini: <span className="font-semibold text-foreground">{current} {item?.unit}</span> · minimum {item?.min_stock}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <RadioGroup value={type} onValueChange={(v) => setType(v as StockMovementType)} className="grid grid-cols-3 gap-2">
            {(["in", "out", "adjustment"] as const).map((t) => (
              <Label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value={t} /> {STOCK_MOVEMENT_LABELS[t]}
              </Label>
            ))}
          </RadioGroup>
          <div className="space-y-2">
            <Label htmlFor="stk-qty">{type === "adjustment" ? `Stok hasil hitung (${item?.unit})` : `Jumlah (${item?.unit})`}</Label>
            <Input id="stk-qty" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Simpan perubahan
            </Button>
          </DialogFooter>
        </form>
        <div className="border-t pt-4">
          <p className="mb-2 text-sm font-semibold">Riwayat stok</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {moves?.length === 0 && <li className="text-muted-foreground">Belum ada riwayat.</li>}
            {moves?.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 odd:bg-muted/50">
                <span>
                  {STOCK_MOVEMENT_LABELS[m.type]}
                  {m.borrowing_item_id ? " · peminjaman" : ""}
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(m.created_at)} · {m.profiles?.name ?? "Sistem"}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {m.type === "out" ? "−" : m.type === "in" || m.quantity > 0 ? "+" : "−"}
                  {Math.abs(m.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
