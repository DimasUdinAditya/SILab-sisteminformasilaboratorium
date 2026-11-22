"use client";

import { useSearch } from "@/lib/router-compat";
import { useNavigate } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, ClipboardCheck, TrendingUp, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bestScore, formatDate, formatScore, learningStatus, MODULE_STATUS_META, STEP_LABELS, type LearnStep } from "@/lib/vlab";
import { dosenModulesQuery, monitoringQuery } from "@/lib/vlab-queries";


function avg(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export default function MonitoringPage() {
  const { modul } = useSearch();
  const navigate = useNavigate();
  const { data: modules, isLoading } = useQuery(dosenModulesQuery);
  const selected = modul ?? modules?.find((m) => m.status === "Published")?.id ?? modules?.[0]?.id;
  const current = modules?.find((m) => m.id === selected);
  const { data } = useQuery({ ...monitoringQuery(selected ?? ""), enabled: !!selected });

  const students = (data?.access ?? [])
    .map((a) => {
      const progress = data!.progress.find((p) => p.student_id === a.student_id) ?? null;
      const mine = data!.attempts.filter((t) => t.student_id === a.student_id);
      const pre = mine.filter((t) => t.assessments?.type === "pre_test");
      const post = mine.filter((t) => t.assessments?.type === "post_test");
      return {
        id: a.student_id,
        name: a.profiles?.name ?? "—",
        nim: a.profiles?.nim_nip ?? "",
        progress,
        pre: bestScore(pre),
        post: bestScore(post),
        waiting: mine.some((t) => t.status === "waiting_review"),
        selfEval: data!.selfEval.some((r) => r.student_id === a.student_id),
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name));

  const started = students.filter((s) => s.progress).length;
  const done = students.filter((s) => learningStatus(s.progress).label === "Selesai").length;
  const avgProgress = avg(students.map((s) => Number(s.progress?.percent ?? 0)));
  const avgPre = avg(students.flatMap((s) => (s.pre == null ? [] : [s.pre])));
  const avgPost = avg(students.flatMap((s) => (s.post == null ? [] : [s.post])));

  return (
    <div>
      <PageHeader
        title="Monitoring Pembelajaran"
        description="Pantau progres belajar, nilai pre-test dan post-test, serta self-evaluation mahasiswa per modul."
        actions={
          <Select value={selected ?? ""} onValueChange={(v) => navigate({ search: { modul: v } })}>
            <SelectTrigger className="w-80" aria-label="Pilih modul">
              <SelectValue placeholder={isLoading ? "Memuat…" : "Pilih modul"} />
            </SelectTrigger>
            <SelectContent>
              {modules?.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.courses?.code} · {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {modules && modules.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          Belum ada modul. Buat modul di menu Kelola Modul.
        </div>
      )}
      {current && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-base font-semibold">{current.title}</h2>
            <StatusBadge {...MODULE_STATUS_META[current.status]} />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Mahasiswa dengan akses" value={data ? students.length : "…"} icon={Users} hint={`${started} sudah mulai belajar`} />
            <StatCard label="Selesai" value={data ? done : "…"} icon={BookOpenCheck} hint={students.length ? `${Math.round((done / students.length) * 100)}% dari peserta` : undefined} />
            <StatCard label="Rata-rata progres" value={avgProgress == null ? "—" : `${Math.round(avgProgress)}%`} icon={TrendingUp} />
            <StatCard
              label="Rata-rata nilai"
              value={avgPost == null ? "—" : formatScore(Math.round(avgPost * 10) / 10)}
              icon={ClipboardCheck}
              hint={`Post-test · pre-test ${avgPre == null ? "—" : formatScore(Math.round(avgPre * 10) / 10)}`}
            />
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead className="w-56">Progres</TableHead>
                  <TableHead>Tahap saat ini</TableHead>
                  <TableHead className="text-right">Pre-test</TableHead>
                  <TableHead className="text-right">Post-test</TableHead>
                  <TableHead>Self-eval</TableHead>
                  <TableHead>Terakhir aktif</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada mahasiswa dengan akses ke modul ini.
                    </TableCell>
                  </TableRow>
                )}
                {students.map((s) => {
                  const st = learningStatus(s.progress);
                  const pct = Number(s.progress?.percent ?? 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.nim}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2" aria-label={`Progres ${s.name}`} />
                          <span className="w-10 text-right text-xs tabular-nums">{Math.round(pct)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.progress?.current_step ? (STEP_LABELS[s.progress.current_step as LearnStep] ?? s.progress.current_step) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatScore(s.pre)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatScore(s.post)}
                        {s.waiting && <span className="ml-1 text-xs text-warning">(koreksi)</span>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={s.selfEval ? "Sudah" : "Belum"} tone={s.selfEval ? "success" : "neutral"} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(s.progress?.last_accessed_at, true)}</TableCell>
                      <TableCell>
                        <StatusBadge {...st} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
