"use client";

import {  } from "@/lib/router-compat";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FileText, Loader2, Microscope, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { CalibrationBadge } from "@/components/labman/badges";
import { PhotoField } from "@/components/labman/photo-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { uploadLabFile, useLabFileUrl } from "@/lib/lab-files";
import { calibrationState, formatDate, labError } from "@/lib/labman";
import { catalogQuery, useMyLabs, type CatalogEquipment } from "@/lib/labman-queries";
import { meQueryOptions } from "@/lib/profile";


function latest(e: CatalogEquipment) {
  return [...(e.calibrations ?? [])].sort((a, b) => (b.next_calibration ?? "").localeCompare(a.next_calibration ?? ""))[0] ?? null;
}

export default function CalibrationPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: labs } = useMyLabs(me?.id);
  const { data: catalog, isLoading } = useQuery(catalogQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const labIds = new Set((labs ?? []).map((l) => l.id));
  const rows = (catalog?.equipment ?? [])
    .filter((e) => e.requires_calibration && labIds.has(e.laboratory_id))
    .map((e) => ({ e, c: latest(e) }))
    .map((r) => ({ ...r, state: calibrationState(true, r.c?.next_calibration) }))
    .sort((a, b) => (a.c?.next_calibration ?? "").localeCompare(b.c?.next_calibration ?? ""));
  const count = (label: string) => rows.filter((r) => r.state.label === label).length;
  const editing = rows.find((r) => r.e.id === editingId) ?? null;

  return (
    <div>
      <PageHeader title="Kalibrasi" description="Alat wajib kalibrasi di laboratorium Anda. Alat kedaluwarsa otomatis tidak bisa dipinjam." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alat wajib kalibrasi" value={catalog ? rows.length : "…"} icon={Microscope} />
        <StatCard label="Valid" value={catalog ? count("Valid") : "…"} icon={Microscope} />
        <StatCard label="Mendekati (≤ 30 hari)" value={catalog ? count("Mendekati") : "…"} icon={Microscope} />
        <StatCard label="Kedaluwarsa / belum" value={catalog ? count("Kedaluwarsa") + count("Belum dikalibrasi") : "…"} icon={Microscope} />
      </div>
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alat</TableHead>
              <TableHead>Terakhir</TableHead>
              <TableHead>Berikutnya</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sertifikat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            )}
            {catalog && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada alat yang ditandai wajib kalibrasi. Tandai di halaman Inventaris.
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ e, c }) => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.code} · {e.laboratories?.name}
                  </p>
                </TableCell>
                <TableCell>{formatDate(c?.last_calibrated, { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                <TableCell>{formatDate(c?.next_calibration, { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                <TableCell>
                  <CalibrationBadge requires next={c?.next_calibration ?? null} />
                </TableCell>
                <TableCell>{c?.certificate_url ? <CertificateLink path={c.certificate_url} /> : <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(e.id)}>
                    <RefreshCcw /> Perbarui
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CalibrationDialog row={editing} onClose={() => setEditingId(null)} />
    </div>
  );
}

function CertificateLink({ path }: { path: string }) {
  const { data: url } = useLabFileUrl("calibration-certificates", path);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline">
      <FileText className="size-4" /> Lihat
    </a>
  ) : (
    <span className="text-xs text-muted-foreground">Memuat…</span>
  );
}

function CalibrationDialog({
  row,
  onClose,
}: {
  row: { e: CatalogEquipment; c: ReturnType<typeof latest> } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [last, setLast] = useState("");
  const [next, setNext] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (row) {
      setLast(row.c?.last_calibrated ?? "");
      setNext(row.c?.next_calibration ?? "");
      setFile(null);
    }
  }, [row]);
  const preview = next ? calibrationState(true, next) : null;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!row) return;
    if (!next) return void toast.error("Tanggal kalibrasi berikutnya wajib diisi.");
    if (last && next <= last) return void toast.error("Tanggal berikutnya harus setelah tanggal terakhir.");
    setBusy(true);
    try {
      const path = file ? await uploadLabFile("calibration-certificates", row.e.id, file) : null;
      const { error } = await supabase.rpc("save_calibration", {
        _equipment_id: row.e.id,
        _last: (last || null) as string,
        _next: next,
        _certificate_path: path as string,
      });
      if (error) throw error;
      toast.success("Data kalibrasi disimpan.");
      await qc.invalidateQueries({ queryKey: ["labman"] });
      onClose();
    } catch (e) {
      toast.error(labError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Kalibrasi · {row?.e.name}</DialogTitle>
            <DialogDescription>Status dihitung otomatis: Mendekati jika jatuh tempo dalam 30 hari, Kedaluwarsa jika sudah lewat.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cal-last">Tanggal kalibrasi terakhir</Label>
              <Input id="cal-last" type="date" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal-next">Kalibrasi berikutnya</Label>
              <Input id="cal-next" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
          </div>
          {preview && (
            <p className="text-sm">
              Status setelah disimpan: <CalibrationBadge requires next={next} />
            </p>
          )}
          <div className="space-y-2">
            <Label>Sertifikat kalibrasi</Label>
            {row?.c?.certificate_url && !file && (
              <p className="text-sm">
                Sertifikat saat ini: <CertificateLink path={row.c.certificate_url} />
              </p>
            )}
            <PhotoField kind="document" file={file} onChange={setFile} label={row?.c?.certificate_url ? "Ganti sertifikat" : "Unggah sertifikat"} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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
