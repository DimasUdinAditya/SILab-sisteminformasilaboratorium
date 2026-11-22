"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ClipboardCheck, Loader2, PackageCheck, Undo2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PhotoActionDialog } from "@/components/labman/photo-action-dialog";
import { ReasonDialog } from "@/components/labman/reason-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { approveWithLetter } from "@/lib/letters.actions";
import { mySignatureQuery } from "@/lib/letters-queries";
import { meQueryOptions } from "@/lib/profile";
import { uploadLabFile } from "@/lib/lab-files";
import { canSubmitReturn, kalabActions, labError, type BorrowingStatus } from "@/lib/labman";

type Props = { id: string; status: BorrowingStatus; hasAlat: boolean; role: "kalab" | "borrower" };

/** Next-step buttons for a borrowing: KaLab processes it, the borrower returns borrowed Alat. */
export function BorrowingActions({ id, status, hasAlat, role }: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "reject" | "readiness" | "verify" | "close" | "return">(null);
  const actions = role === "kalab" ? kalabActions(status, hasAlat) : [];
  const canReturn = role === "borrower" && canSubmitReturn(status, hasAlat);
  const approveFn = useServerFn(approveWithLetter);
  const { data: me } = useQuery(meQueryOptions);
  const needsSig = actions.includes("approve");
  const { data: signature, isLoading: sigLoading } = useQuery({ ...mySignatureQuery(me?.id ?? ""), enabled: needsSig && !!me });

  async function approve() {
    setBusy(true);
    try {
      const res = await approveFn({ data: { kind: "borrowing", id } });
      if (res.letter) toast.success(`Peminjaman disetujui dan surat ${res.letterNumber ?? ""} diterbitkan.`);
      else toast.warning(`Peminjaman disetujui, tetapi surat resmi gagal dibuat: ${res.letterError}`);
    } catch (e) {
      toast.error(labError(e));
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["labman"] });
  }

  async function run(fn: () => PromiseLike<{ error: unknown }>, success: string): Promise<boolean> {
    const { error } = await fn();
    if (error) {
      toast.error(labError(error));
      await refresh();
      return false;
    }
    toast.success(success);
    await refresh();
    return true;
  }

  async function simple(fn: () => PromiseLike<{ error: unknown }>, success: string) {
    setBusy(true);
    await run(fn, success);
    setBusy(false);
  }

  async function withPhoto(bucket: "readiness-photos" | "return-photos", file: File, note: string) {
    let path: string;
    try {
      path = await uploadLabFile(bucket, id, file);
    } catch (e) {
      toast.error(labError(e));
      return false;
    }
    return bucket === "readiness-photos"
      ? run(() => supabase.rpc("confirm_readiness", { _id: id, _photo_path: path, _note: note }), "Barang siap diambil. Status menjadi Dipinjam.")
      : run(() => supabase.rpc("submit_return", { _id: id, _photo_path: path, _note: note }), "Bukti pengembalian terkirim. Menunggu verifikasi KaLab.");
  }

  if (!actions.length && !canReturn) return null;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h3 className="mb-1 text-base font-semibold">Tindakan</h3>
      <p className="mb-4 text-sm text-muted-foreground">{hint(status, role, hasAlat)}</p>
      {needsSig && !sigLoading && !signature && (
        <p className="mb-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">
          Surat resmi memakai tanda tangan Anda. Unggah dulu di{" "}
          <Link to="/profil" className="font-medium underline">Profil Akun</Link>.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.includes("approve") && (
          <Button disabled={busy || sigLoading || !signature} onClick={approve}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Setujui
          </Button>
        )}
        {actions.includes("reject") && (
          <Button variant="outline" className="text-destructive" onClick={() => setDialog("reject")}>
            <X /> Tolak
          </Button>
        )}
        {actions.includes("readiness") && (
          <Button onClick={() => setDialog("readiness")}>
            <PackageCheck /> Konfirmasi Kesiapan
          </Button>
        )}
        {actions.includes("complete") && (
          <Button disabled={busy} onClick={() => simple(() => supabase.rpc("complete_consumable_borrowing", { _id: id }), "Peminjaman bahan selesai.")}>
            {busy ? <Loader2 className="animate-spin" /> : <CheckCheck />} Tandai Selesai
          </Button>
        )}
        {actions.includes("verify") && (
          <Button onClick={() => setDialog("verify")}>
            <ClipboardCheck /> Verifikasi Pengembalian
          </Button>
        )}
        {actions.includes("close") && (
          <Button onClick={() => setDialog("close")}>
            <CheckCheck /> Selesaikan
          </Button>
        )}
        {canReturn && (
          <Button onClick={() => setDialog("return")}>
            <Undo2 /> Kembalikan Alat
          </Button>
        )}
      </div>

      <ReasonDialog
        open={dialog === "reject"}
        onOpenChange={(o) => setDialog(o ? "reject" : null)}
        title="Tolak peminjaman"
        description="Alasan akan terlihat oleh peminjam."
        label="Alasan penolakan"
        required
        destructive
        confirmLabel="Tolak Peminjaman"
        onConfirm={(reason) => run(() => supabase.rpc("reject_borrowing", { _id: id, _reason: reason }), "Peminjaman ditolak.")}
      />
      <ReasonDialog
        open={dialog === "close"}
        onOpenChange={(o) => setDialog(o ? "close" : null)}
        title="Selesaikan peminjaman"
        description="Catat tindak lanjut atas ketidaksesuaian. Alat dikembalikan ke stok tersedia."
        label="Tindak lanjut"
        confirmLabel="Selesaikan"
        onConfirm={(text) => run(() => supabase.rpc("close_borrowing", { _id: id, _follow_up: text }), "Peminjaman diselesaikan.")}
      />
      <PhotoActionDialog
        open={dialog === "readiness"}
        onOpenChange={(o) => setDialog(o ? "readiness" : null)}
        title="Konfirmasi kesiapan barang"
        description="Unggah foto alat dan bahan yang sudah disiapkan untuk diambil peminjam."
        photoLabel="Foto kesiapan"
        confirmLabel="Konfirmasi"
        onSubmit={(file, note) => withPhoto("readiness-photos", file, note)}
      />
      <PhotoActionDialog
        open={dialog === "return"}
        onOpenChange={(o) => setDialog(o ? "return" : null)}
        title="Kembalikan alat"
        description="Unggah foto alat yang dikembalikan. Kepala Laboratorium akan memeriksa kesesuaiannya."
        photoLabel="Foto pengembalian"
        confirmLabel="Kirim Bukti"
        onSubmit={(file, note) => withPhoto("return-photos", file, note)}
      />
      <VerifyDialog
        open={dialog === "verify"}
        onOpenChange={(o) => setDialog(o ? "verify" : null)}
        onConfirm={(result, note) =>
          run(
            () => supabase.rpc("verify_return", { _id: id, _result: result, _note: note }),
            result === "Sesuai" ? "Pengembalian sesuai. Peminjaman dikonfirmasi." : "Ketidaksesuaian dicatat. Status menjadi Ditunggu.",
          )
        }
      />
    </div>
  );
}

function hint(status: BorrowingStatus, role: Props["role"], hasAlat: boolean) {
  if (role === "borrower") return "Setelah alat dikembalikan ke laboratorium, unggah foto buktinya.";
  switch (status) {
    case "Diajukan":
      return "Saat disetujui, stok alat dan bahan langsung dipotong.";
    case "Disetujui":
      return "Siapkan barang, lalu unggah foto kesiapan agar peminjam dapat mengambilnya.";
    case "Dipinjam":
      return hasAlat ? "" : "Peminjaman hanya berisi bahan habis pakai. Tandai selesai setelah diambil.";
    case "Dikembalikan":
      return "Periksa alat yang dikembalikan dengan foto bukti dari peminjam.";
    case "Ditunggu":
      return "Selesaikan setelah ketidaksesuaian ditindaklanjuti.";
    default:
      return "";
  }
}

function VerifyDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (result: "Sesuai" | "Tidak_Sesuai", note: string) => Promise<boolean>;
}) {
  const [result, setResult] = useState<"Sesuai" | "Tidak_Sesuai">("Sesuai");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const noteMissing = result === "Tidak_Sesuai" && !note.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (noteMissing) return;
    setBusy(true);
    const ok = await onConfirm(result, note.trim());
    setBusy(false);
    if (ok) {
      setNote("");
      setResult("Sesuai");
      setTried(false);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Verifikasi pengembalian</DialogTitle>
            <DialogDescription>Bandingkan alat yang diterima dengan daftar item dan foto bukti.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={result} onValueChange={(v) => setResult(v as "Sesuai" | "Tidak_Sesuai")} className="gap-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value="Sesuai" /> <span className="text-sm font-medium">Sesuai — jumlah dan kondisi lengkap</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value="Tidak_Sesuai" /> <span className="text-sm font-medium">Tidak sesuai — ada yang kurang atau rusak</span>
            </label>
          </RadioGroup>
          <div className="space-y-2">
            <Label htmlFor="verify-note">
              Catatan{result === "Sesuai" && <span className="text-muted-foreground"> (opsional)</span>}
            </Label>
            <Textarea id="verify-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            {tried && noteMissing && <p className="text-sm text-destructive">Catatan ketidaksesuaian wajib diisi.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Simpan Verifikasi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
