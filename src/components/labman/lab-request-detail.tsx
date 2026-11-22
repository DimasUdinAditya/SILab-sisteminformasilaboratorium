"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LabRequestBadge } from "@/components/labman/badges";
import { EndorsementCard } from "@/components/labman/endorsement-card";
import { LetterCard } from "@/components/labman/letter-card";
import { ReasonDialog } from "@/components/labman/reason-dialog";
import { StatusTimeline } from "@/components/labman/status-timeline";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@/lib/server-fn-compat";
import { Link } from "@/lib/router-compat";

import { supabase } from "@/integrations/supabase/client";
import { approveWithLetter } from "@/lib/letters.actions";
import { mySignatureQuery } from "@/lib/letters-queries";
import { meQueryOptions } from "@/lib/profile";
import { formatDate, formatDateTime, formatTime, labError, overlaps } from "@/lib/labman";
import { labRequestQuery, scheduleQuery } from "@/lib/labman-queries";

export function LabRequestDetail({ id, manage }: { id: string; manage?: boolean }) {
  const { data: r, isLoading } = useQuery(labRequestQuery(id));
  const pending = r?.status === "Diajukan";
  const { data: sameDay } = useQuery({
    ...scheduleQuery(r?.laboratory_id ?? "", r?.usage_date ?? "", r?.usage_date ?? ""),
    enabled: !!manage && pending,
  });
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const approveFn = useServerFn(approveWithLetter);
  const { data: me } = useQuery(meQueryOptions);
  const { data: signature, isLoading: sigLoading } = useQuery({ ...mySignatureQuery(me?.id ?? ""), enabled: !!manage && !!me && pending });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!r) return <p className="text-sm text-muted-foreground">Pengajuan tidak ditemukan.</p>;
  const conflicts = (sameDay ?? []).filter((e) => overlaps(e.start_time, e.end_time, r.start_time, r.end_time));

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["labman"] });
  }

  async function approve() {
    setBusy(true);
    try {
      const res = await approveFn({ data: { kind: "lab", id } });
      if (res.letter) toast.success(`Pengajuan disetujui, jadwal dikunci, dan surat ${res.letterNumber ?? ""} diterbitkan.`);
      else toast.warning(`Pengajuan disetujui, tetapi surat resmi gagal dibuat: ${res.letterError}`);
    } catch (e) {
      toast.error(labError(e));
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  async function reject(reason: string) {
    const { error } = await supabase.rpc("reject_lab_request", { _id: id, _reason: reason });
    if (error) {
      toast.error(labError(error));
      return false;
    }
    toast.success("Pengajuan ditolak.");
    await refresh();
    return true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Pengajuan penggunaan</p>
              <h2 className="text-lg font-semibold">{r.laboratories?.name}</h2>
            </div>
            <LabRequestBadge status={r.status} />
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Field label="Tanggal">{formatDate(r.usage_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Field>
            <Field label="Jam">
              {formatTime(r.start_time)}–{formatTime(r.end_time)}
            </Field>
            <Field label="Pemohon">
              {r.requester?.name} <span className="text-muted-foreground">· {r.requester?.roles?.name}{r.requester?.nim_nip ? ` · ${r.requester.nim_nip}` : ""}</span>
            </Field>
            <Field label="Diajukan">{formatDateTime(r.created_at)}</Field>
            <div className="sm:col-span-2">
              <Field label="Tujuan">{r.purpose}</Field>
            </div>
            {r.status === "Ditolak" && (
              <div className="rounded-lg bg-danger-soft p-3 text-destructive sm:col-span-2">
                <p className="text-xs font-semibold">Alasan penolakan</p>
                <p>{r.rejection_reason}</p>
              </div>
            )}
            {r.status !== "Diajukan" && (
              <Field label={r.status === "Disetujui" ? "Disetujui oleh" : "Diproses oleh"}>
                {r.approver?.name ?? "-"} · {formatDateTime(r.approved_at)}
              </Field>
            )}
          </dl>
        </div>

        {manage && pending && (
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <h3 className="mb-3 text-base font-semibold">Keputusan</h3>
            {conflicts.length > 0 ? (
              <p className="mb-4 flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Bentrok dengan {conflicts.map((c) => `"${c.activity ?? "kegiatan"}" (${formatTime(c.start_time)}–${formatTime(c.end_time)})`).join(", ")}. Pengajuan ini tidak dapat disetujui.
              </p>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">Slot masih kosong. Saat disetujui, jadwal diperiksa ulang lalu dikunci di kalender laboratorium.</p>
            )}
            {!sigLoading && !signature && (
              <p className="mb-4 flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Surat resmi memakai tanda tangan Anda. Unggah dulu di{" "}
                  <Link to="/profil" className="font-medium underline">Profil Akun</Link>.
                </span>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={approve} disabled={busy || conflicts.length > 0 || sigLoading || !signature}>
                {busy ? <Loader2 className="animate-spin" /> : <Check />} Setujui
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setRejecting(true)}>
                <X /> Tolak
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h3 className="mb-4 text-base font-semibold">Riwayat status</h3>
          <StatusTimeline entries={r.status_history} />
        </div>
        <LetterCard
          kind="lab"
          id={r.id}
          status={r.status}
          canIssue={!!manage}
          source={{
            kind: "lab",
            requesterName: r.requester?.name ?? "-",
            nimNip: r.requester?.nim_nip ?? null,
            labName: r.laboratories?.name ?? "-",
            purpose: r.purpose,
            date: r.usage_date,
            startTime: r.start_time,
            endTime: r.end_time,
            approvedAt: r.approved_at,
            kalabName: r.approver?.name ?? r.labKalab?.kalab?.name ?? null,
          }}
        />
        {r.status === "Disetujui" && <EndorsementCard kind="lab" id={r.id} />}
      </div>

      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Tolak pengajuan"
        description="Alasan akan terlihat oleh pemohon."
        label="Alasan penolakan"
        required
        destructive
        confirmLabel="Tolak Pengajuan"
        onConfirm={reject}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
