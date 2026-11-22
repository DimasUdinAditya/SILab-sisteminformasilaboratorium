"use client";

import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { LabCatalog } from "@/components/labman/lab-catalog";
import { labsQuery } from "@/lib/labman-queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FlaskConical, Loader2, Minus, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { ItemTypeBadge } from "@/components/labman/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { addDays, formatDate, isAtLeastTomorrow, labError, minRequestDate } from "@/lib/labman";
import { meQueryOptions } from "@/lib/profile";


export default function BorrowFormPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const c = useCart();
  const { data: labs } = useQuery(labsQuery);
  const [pickLabId, setPickLabId] = useState<string>("");
  // Default to the lab already in the cart, otherwise the first lab.
  const pickLab = (labs ?? []).find((l) => l.id === (pickLabId || c.labId || labs?.[0]?.id));
  const [borrowDate, setBorrowDate] = useState(minRequestDate());
  const [dueDate, setDueDate] = useState(addDays(minRequestDate(), 2));
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hasAlat = c.items.some((i) => i.type === "Alat");
  const validBorrow = isAtLeastTomorrow(borrowDate);
  const validDue = !hasAlat || (!!dueDate && dueDate >= borrowDate);

  if (me?.role !== "mahasiswa" && me?.role !== "dosen")
    return <p className="text-sm text-muted-foreground">Pengajuan peminjaman hanya untuk mahasiswa dan dosen.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!c.labId || c.items.length === 0) return void toast.error("Keranjang masih kosong.");
    if (!validBorrow) return void toast.error("Peminjaman paling lambat H-1 (mulai besok).");
    if (!validDue) return void toast.error("Tanggal kembali wajib diisi dan tidak boleh sebelum tanggal pinjam.");
    if (!purpose.trim()) return void toast.error("Tujuan peminjaman wajib diisi.");
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_borrowing", {
      _lab_id: c.labId,
      _purpose: purpose,
      _borrow_date: borrowDate,
      _return_due_date: (hasAlat ? dueDate : null) as string,
      _items: c.items.map((i) => ({ item_type: i.type, id: i.id, quantity: i.quantity })),
    });
    setBusy(false);
    if (error) {
      toast.error(labError(error));
      await qc.invalidateQueries({ queryKey: ["labman", "catalog"] });
      return;
    }
    cart.clear();
    toast.success("Peminjaman diajukan. Menunggu persetujuan Kepala Laboratorium.");
    await qc.invalidateQueries({ queryKey: ["labman"] });
    navigate({ to: "/peminjaman/$id", params: { id: data } });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ajukan Peminjaman Alat & Bahan" description={c.labName ?? undefined} />
      <div className="mb-8 space-y-4">
        <div className="space-y-2">
          <Label>Laboratorium</Label>
          <Select value={pickLabId} onValueChange={setPickLabId}>
            <SelectTrigger aria-label="Pilih laboratorium" className="max-w-sm">
              <SelectValue placeholder="Pilih laboratorium" />
            </SelectTrigger>
            <SelectContent>
              {labs?.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pickLab && <LabCatalog lab={{ id: pickLab.id, name: pickLab.name }} />}
      </div>
      {c.items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Keranjang masih kosong. Tambahkan alat atau bahan dari daftar di atas.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6 shadow-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Keranjang</Label>
            </div>
            <ul className="divide-y rounded-lg border">
              {c.items.map((i) => (
                <li key={`${i.type}-${i.id}`} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <ItemTypeBadge type={i.type} /> maks. {i.max} {i.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="outline" aria-label={`Kurangi ${i.name}`} disabled={i.quantity <= 1} onClick={() => cart.setQuantity(i.type, i.id, i.quantity - 1)}>
                      <Minus />
                    </Button>
                    <Input
                      aria-label={`Jumlah ${i.name}`}
                      type="number"
                      min={1}
                      max={i.max}
                      value={i.quantity}
                      className="w-16 text-center"
                      onChange={(e) => cart.setQuantity(i.type, i.id, Number(e.target.value) || 1)}
                    />
                    <Button type="button" size="icon" variant="outline" aria-label={`Tambah ${i.name}`} disabled={i.quantity >= i.max} onClick={() => cart.setQuantity(i.type, i.id, i.quantity + 1)}>
                      <Plus />
                    </Button>
                  </div>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Hapus ${i.name}`} onClick={() => cart.remove(i.type, i.id)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="b-date">Tanggal pinjam <span className="text-destructive">*</span></Label>
              <Input id="b-date" type="date" min={minRequestDate()} value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} />
              {!validBorrow && borrowDate && <p className="text-sm text-destructive">Tanggal paling cepat {formatDate(minRequestDate())}.</p>}
              <p className="text-xs text-muted-foreground">Pengajuan paling lambat H-1.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-due">Tanggal kembali {hasAlat && <span className="text-destructive">*</span>}</Label>
              <Input id="b-due" type="date" min={borrowDate} value={hasAlat ? dueDate : ""} disabled={!hasAlat} onChange={(e) => setDueDate(e.target.value)} />
              {hasAlat ? (
                !validDue && <p className="text-sm text-destructive">Tidak boleh sebelum tanggal pinjam.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Hanya bahan habis pakai, tidak perlu dikembalikan.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="b-purpose">Tujuan peminjaman <span className="text-destructive">*</span></Label>
            <Textarea id="b-purpose" rows={3} maxLength={1000} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Contoh: Latihan pemeriksaan tanda vital kelompok 3" />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => cart.clear()}>
              Kosongkan
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />} Ajukan Peminjaman
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
