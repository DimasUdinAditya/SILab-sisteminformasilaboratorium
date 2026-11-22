"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { jakartaToday, labError, toMinutes } from "@/lib/labman";

export type EntryDraft = { id?: string; date: string; start_time: string; end_time: string; activity: string };

/** KaLab adds or edits an unlocked schedule entry; the database rejects overlaps. */
export function ScheduleEntryDialog({
  labId,
  draft,
  onClose,
}: {
  labId: string;
  draft: EntryDraft | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<EntryDraft>({ date: "", start_time: "", end_time: "", activity: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (draft) setF({ ...draft, start_time: draft.start_time.slice(0, 5), end_time: draft.end_time.slice(0, 5) });
  }, [draft]);

  async function done(msg: string) {
    toast.success(msg);
    await qc.invalidateQueries({ queryKey: ["labman", "schedule"] });
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.date || !f.start_time || !f.end_time) return void toast.error("Tanggal dan jam wajib diisi.");
    if (toMinutes(f.end_time) <= toMinutes(f.start_time)) return void toast.error("Jam selesai harus setelah jam mulai.");
    if (!f.activity.trim()) return void toast.error("Nama kegiatan wajib diisi.");
    setBusy(true);
    const row = { date: f.date, start_time: f.start_time, end_time: f.end_time, activity: f.activity.trim() };
    const { error } = f.id
      ? await supabase.from("laboratory_schedule_entries").update(row).eq("id", f.id)
      : await supabase.from("laboratory_schedule_entries").insert({ ...row, laboratory_id: labId });
    setBusy(false);
    if (error) return void toast.error(labError(error));
    await done("Jadwal disimpan.");
  }

  async function remove() {
    if (!f.id) return;
    setBusy(true);
    const { error } = await supabase.from("laboratory_schedule_entries").delete().eq("id", f.id);
    setBusy(false);
    if (error) return void toast.error(labError(error));
    await done("Jadwal dihapus.");
  }

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{f.id ? "Ubah jadwal" : "Tambah jadwal"}</DialogTitle>
            <DialogDescription>Jadwal tidak boleh bentrok dengan kegiatan lain di laboratorium ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="se-activity">Kegiatan</Label>
            <Input id="se-activity" value={f.activity} maxLength={200} placeholder="mis. Praktikum KEP101" onChange={(e) => setF({ ...f, activity: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="se-date">Tanggal</Label>
              <Input id="se-date" type="date" min={jakartaToday()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-start">Mulai</Label>
              <Input id="se-start" type="time" step={900} value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-end">Selesai</Label>
              <Input id="se-end" type="time" step={900} value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {f.id ? (
              <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>
                <Trash2 /> Hapus
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Simpan
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
