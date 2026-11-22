"use client";

import { useParams } from "@/lib/router-compat";
import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { DAY_SLOTS, formatDate, isAtLeastTomorrow, isSlotFree, labError, minRequestDate, rangeFromSlots } from "@/lib/labman";
import { labQuery, scheduleQuery } from "@/lib/labman-queries";
import { meQueryOptions } from "@/lib/profile";
import { cn } from "@/lib/utils";


export default function RequestFormPage() {
  const { id } = useParams();
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: lab } = useQuery(labQuery(id));
  const [date, setDate] = useState(minRequestDate());
  const [picked, setPicked] = useState<number[]>([]);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const validDate = isAtLeastTomorrow(date);
  const { data: entries, isLoading } = useQuery({ ...scheduleQuery(id, date, date), enabled: validDate });
  const range = rangeFromSlots(picked);
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (me?.role !== "mahasiswa" && me?.role !== "dosen")
    return <p className="text-sm text-muted-foreground">Pengajuan penggunaan hanya untuk mahasiswa dan dosen.</p>;

  function toggle(i: number) {
    setPicked((p) => {
      const next = p.includes(i) ? p.filter((x) => x !== i) : [...p, i];
      if (next.length && !rangeFromSlots(next)) {
        toast.error("Pilih slot yang berurutan.");
        return p;
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validDate) return void toast.error("Pengajuan paling lambat H-1 (mulai besok).");
    if (!range) return void toast.error("Pilih minimal satu slot kosong.");
    if (!purpose.trim()) return void toast.error("Tujuan penggunaan wajib diisi.");
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_lab_request", {
      _lab_id: id,
      _date: date,
      _start: range.start,
      _end: range.end,
      _purpose: purpose,
    });
    setBusy(false);
    if (error) {
      toast.error(labError(error));
      await qc.invalidateQueries({ queryKey: ["labman", "schedule"] });
      return;
    }
    toast.success("Pengajuan terkirim. Menunggu persetujuan Kepala Laboratorium.");
    await qc.invalidateQueries({ queryKey: ["labman"] });
    navigate({ to: "/laboratorium/pengajuan/$id", params: { id: data } });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ajukan Penggunaan Laboratorium" description={lab?.name} />
      <form onSubmit={submit} className="space-y-6 rounded-xl border bg-card p-6 shadow-card">
        <div className="space-y-2">
          <Label htmlFor="req-date">Tanggal penggunaan <span className="text-destructive">*</span></Label>
          <Input
            id="req-date"
            type="date"
            min={minRequestDate()}
            value={date}
            className="w-auto"
            onChange={(e) => {
              setDate(e.target.value);
              setPicked([]);
            }}
          />
          <p className="text-xs text-muted-foreground">Pengajuan paling lambat H-1. {validDate && formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          {!validDate && date && <p className="text-sm text-destructive">Tanggal paling cepat {formatDate(minRequestDate())}.</p>}
        </div>

        <div className="space-y-2">
          <Label>Pilih slot (07:00–17:00) <span className="text-destructive">*</span></Label>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat jadwal…</p>}
          {validDate && entries && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {DAY_SLOTS.map((s, i) => {
                const free = isSlotFree(s, entries);
                const on = picked.includes(i);
                return (
                  <button
                    key={s.start}
                    type="button"
                    disabled={!free}
                    aria-pressed={on}
                    onClick={() => toggle(i)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition",
                      !free && "cursor-not-allowed bg-muted text-muted-foreground line-through",
                      free && !on && "hover:border-primary hover:text-primary",
                      on && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {s.start}–{s.end}
                    <span className="block text-[11px] font-normal">{free ? (on ? "Dipilih" : "Kosong") : "Terisi"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {range && (
            <p className="text-sm">
              Waktu dipilih: <span className="font-semibold">{range.start}–{range.end}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="req-purpose">Tujuan penggunaan <span className="text-destructive">*</span></Label>
          <Textarea id="req-purpose" rows={4} maxLength={1000} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="mis. Latihan mandiri pemeriksaan tanda-tanda vital" />
        </div>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" type="button">
            <Link to="/laboratorium/$id" params={{ id }}>
              Batal
            </Link>
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />} Kirim Pengajuan
          </Button>
        </div>
      </form>
    </div>
  );
}
