"use client";

import {  } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { CheckCircle2, FileText, Loader2, Stamp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateTime, labError } from "@/lib/labman";
import { endorseLetter, getLetterLink } from "@/lib/letters.actions";


type Status = "Menunggu_Pengesahan" | "Disahkan";

const queueQuery = (status: Status) => ({
  queryKey: ["labman", "endorsements", status],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("borrowing_endorsements")
      .select(
        `id, request_type, status, note, created_at, endorsed_at, lab_usage_request_id, borrowing_id,
        lab:lab_usage_requests(id, usage_date, start_time, end_time, purpose, laboratories(name), requester:profiles!lab_usage_requests_requester_id_fkey(name, nim_nip)),
        borrowing:equipment_borrowings(id, borrow_date, return_due_date, purpose, laboratories(name), borrower:profiles!equipment_borrowings_borrower_id_fkey(name, nim_nip), borrowing_items(id))`,
      )
      .eq("status", status)
      // Paling baru di atas, untuk kedua tab.
      .order(status === "Disahkan" ? "endorsed_at" : "created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export default function EndorsementPage() {
  const [tab, setTab] = useState<Status>("Menunggu_Pengesahan");
  const { data, isLoading } = useQuery(queueQuery(tab));
  const [target, setTarget] = useState<{ id: string; label: string; kind: "lab" | "borrowing"; reqId: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const qc = useQueryClient();
  const linkFn = useServerFn(getLetterLink);

  async function openLetter(kind: "lab" | "borrowing", id: string) {
    setOpening(id);
    try {
      const res = await linkFn({ data: { kind, id } });
      if (!res.ok) return void toast.error(res.error);
      window.open(res.url, "_blank", "noopener");
    } catch (e) {
      toast.error(labError(e));
    } finally {
      setOpening(null);
    }
  }

  async function endorse() {
    if (!target) return;
    setBusy(true);
    // The server action records the endorsement and places the Dekan signature on the official letter.
    const res = await endorseLetter({ kind: target.kind, id: target.reqId, note: note.trim() || undefined });
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(res.letter ? "Pengajuan telah disahkan. Surat resmi sudah memuat tanda tangan Dekan." : `Pengajuan telah disahkan. ${res.letterError ?? ""}`.trim());
    setTarget(null);
    setNote("");
    await qc.invalidateQueries({ queryKey: ["labman"] });
  }

  return (
    <div>
      <PageHeader
        title="Pengesahan Peminjaman"
        description="Pengajuan yang sudah disetujui KaLab. Pengesahan bersifat administratif dan tidak menghambat pemakaian lab atau pengambilan barang."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)} className="mb-4">
        <TabsList>
          <TabsTrigger value="Menunggu_Pengesahan">Menunggu Pengesahan</TabsTrigger>
          <TabsTrigger value="Disahkan">Sudah Disahkan</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {!isLoading && !data?.length && (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          {tab === "Disahkan" ? "Belum ada pengajuan yang disahkan." : "Tidak ada pengajuan yang menunggu pengesahan."}
        </div>
      )}
      <div className="space-y-3">
        {data?.map((e) => {
          const isLab = !!e.lab;
          const kind = isLab ? "lab" : "borrowing";
          const reqId = (e.lab_usage_request_id ?? e.borrowing_id)!;
          const person = isLab ? e.lab?.requester : e.borrowing?.borrower;
          const lab = isLab ? e.lab?.laboratories?.name : e.borrowing?.laboratories?.name;
          const when = isLab
            ? `${formatDate(e.lab!.usage_date, { day: "numeric", month: "long", year: "numeric" })} · ${e.lab!.start_time.slice(0, 5)}–${e.lab!.end_time.slice(0, 5)}`
            : `${formatDate(e.borrowing!.borrow_date, { day: "numeric", month: "long", year: "numeric" })} · ${e.borrowing!.borrowing_items.length} item`;
          return (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-card">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {isLab ? (
                    <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-800">Penggunaan Lab</Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-700 bg-slate-700 text-white">Peminjaman Alat & Bahan</Badge>
                  )}
                  {e.status === "Disahkan" ? (
                    <Badge className="bg-success-soft text-success hover:bg-success-soft">Disahkan</Badge>
                  ) : (
                    <Badge className="bg-warning-soft text-warning hover:bg-warning-soft">Menunggu Pengesahan</Badge>
                  )}
                </div>
                <p className="font-semibold">{lab}</p>
                <p className="text-sm text-muted-foreground">
                  {person?.name ?? "-"}
                  {person?.nim_nip ? ` · ${person.nim_nip}` : ""} · {when}
                </p>
                <p className="line-clamp-1 text-sm text-muted-foreground">Tujuan: {isLab ? e.lab?.purpose : e.borrowing?.purpose}</p>
                <p className="text-xs text-muted-foreground">
                  Masuk antrean {formatDateTime(e.created_at)}
                  {e.endorsed_at ? ` · Disahkan ${formatDateTime(e.endorsed_at)}` : ""}
                  {e.note ? ` · Catatan: ${e.note}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={opening === reqId} onClick={() => openLetter(kind, reqId)}>
                  {opening === reqId ? <Loader2 className="animate-spin" /> : <FileText />} Lihat Surat
                </Button>
                {e.status === "Menunggu_Pengesahan" ? (
                  <Button onClick={() => setTarget({ id: e.id, label: `${lab} — ${person?.name ?? ""}`, kind: e.request_type === "lab_usage" ? "lab" : "borrowing", reqId: reqId })}>
                    <Stamp /> Sahkan
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-success">
                    <CheckCircle2 className="size-4" /> Disahkan
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && !busy && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sahkan pengajuan?</AlertDialogTitle>
            <AlertDialogDescription>{target?.label}. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Textarea id="note" value={note} maxLength={500} onChange={(ev) => setNote(ev.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(ev) => {
                ev.preventDefault();
                void endorse();
              }}
            >
              {busy && <Loader2 className="animate-spin" />} Sahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
