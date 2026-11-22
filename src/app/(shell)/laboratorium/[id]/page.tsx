"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarPlus, MapPin, Pencil, Plus, UserCircle, Users } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { LabFormDialog } from "@/components/labman/lab-form-dialog";
import { ScheduleEntryDialog, type EntryDraft } from "@/components/labman/schedule-entry-dialog";
import { WeekCalendar, WeekNav } from "@/components/labman/week-calendar";
import { Button } from "@/components/ui/button";
import { addDays, jakartaToday, weekStart } from "@/lib/labman";
import { labQuery, scheduleQuery } from "@/lib/labman-queries";
import { meQueryOptions } from "@/lib/profile";


export default function LabDetailPage() {
  const { id } = useParams();
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: lab, isLoading } = useQuery(labQuery(id));
  const [start, setStart] = useState(() => weekStart(jakartaToday()));
  const { data: entries } = useQuery(scheduleQuery(id, start, addDays(start, 6)));
  const [editLab, setEditLab] = useState(false);
  const [draft, setDraft] = useState<EntryDraft | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!lab) return <p className="text-sm text-muted-foreground">Laboratorium tidak ditemukan.</p>;
  const isOwner = me?.role === "kalab" && lab.kalab_id === me.id;
  const canRequest = me?.role === "mahasiswa" || me?.role === "dosen";

  return (
    <div className="space-y-6">
      <PageHeader
        title={lab.name}
        description={lab.program_studies?.name}
        actions={
          <>
            {isOwner && (
              <>
                <Button variant="outline" onClick={() => setEditLab(true)}>
                  <Pencil /> Ubah data
                </Button>
                <Button onClick={() => setDraft({ date: addDays(jakartaToday(), 1), start_time: "08:00", end_time: "10:00", activity: "" })}>
                  <Plus /> Tambah jadwal
                </Button>
              </>
            )}
            {canRequest && (
              <Button asChild>
                <Link to="/laboratorium/$id/ajukan" params={{ id }}>
                  <CalendarPlus /> Ajukan Penggunaan
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-4 rounded-xl border bg-card p-5 shadow-card sm:grid-cols-3">
        <Info icon={MapPin} label="Lokasi" value={lab.location ?? "-"} />
        <Info icon={Users} label="Kapasitas" value={lab.capacity != null ? `${lab.capacity} orang` : "-"} />
        <Info icon={UserCircle} label="Kepala laboratorium" value={lab.kalab?.name ?? "-"} />
        {lab.description && <p className="text-sm text-muted-foreground sm:col-span-3">{lab.description}</p>}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Jadwal mingguan</h2>
          <WeekNav start={start} onChange={setStart} />
        </div>
        {isOwner && (
          <p className="text-xs text-muted-foreground">Klik jam kosong untuk menambah jadwal, atau klik jadwal untuk mengubahnya. Jadwal terkunci berasal dari pengajuan yang disetujui.</p>
        )}
        <WeekCalendar
          start={start}
          entries={entries ?? []}
          onEmptyClick={
            isOwner
              ? (date, hour) =>
                  setDraft({ date, start_time: `${String(hour).padStart(2, "0")}:00`, end_time: `${String(hour + 1).padStart(2, "0")}:00`, activity: "" })
              : undefined
          }
          onEntryClick={
            isOwner
              ? (e) => {
                  if (!e.is_locked) setDraft({ id: e.id, date: e.date, start_time: e.start_time, end_time: e.end_time, activity: e.activity ?? "" });
                }
              : undefined
          }
        />
      </div>
      {isOwner && (
        <>
          <LabFormDialog open={editLab} onOpenChange={setEditLab} lab={lab} />
          <ScheduleEntryDialog labId={lab.id} draft={draft} onClose={() => setDraft(null)} />
        </>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
