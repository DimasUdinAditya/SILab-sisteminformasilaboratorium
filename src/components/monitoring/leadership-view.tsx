"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpenCheck, ClipboardList, FileSignature, FlaskConical, GraduationCap, PackageOpen, Users } from "lucide-react";

import { StatCard } from "@/components/app/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTIVE_BORROWING, leadershipSummaryQuery, pct, sum, type Period, type ProdiStats } from "@/lib/summary";

const score = (avg: number | null, n: number) => (avg != null ? String(avg) : n > 0 ? "< 3 data" : "—");

export function LeadershipCards({ period, compact }: { period: Period; compact?: boolean }) {
  const { data, isLoading, error } = useQuery(leadershipSummaryQuery(period));
  if (error) return <p className="text-sm text-destructive">Gagal memuat ringkasan: {error.message}</p>;
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Memuat ringkasan…</p>;
  const t = data.totals;
  const e = data.endorsements;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {e && <StatCard label="Menunggu pengesahan" value={e.pending} icon={FileSignature} hint={`${e.endorsed_in_period} disahkan pada periode ini`} />}
      <StatCard label="Mahasiswa aktif" value={t.students} icon={Users} />
      <StatCard label="Modul terbit" value={`${t.modules_published}/${t.modules_total}`} icon={BookOpenCheck} />
      <StatCard label="Rata-rata progres belajar" value={t.avg_progress != null ? `${t.avg_progress}%` : "—"} icon={GraduationCap} hint={`${t.completed} dari ${t.accessed} modul diakses selesai`} />
      <StatCard label="Pengajuan lab" value={sum(t.lab_requests)} icon={ClipboardList} hint={`${t.lab_requests["Disetujui"] ?? 0} disetujui · ${t.lab_requests["Diajukan"] ?? 0} menunggu`} />
      <StatCard label="Peminjaman alat & bahan" value={sum(t.borrowings)} icon={PackageOpen} hint={`${sum(t.borrowings, ACTIVE_BORROWING)} sedang berjalan`} />
      {!compact && <StatCard label="Laboratorium" value={t.labs} icon={FlaskConical} />}
      <StatCard label="Peminjaman terlambat" value={t.overdue} icon={AlertTriangle} />
    </div>
  );
}

export function ProdiTable({ period }: { period: Period }) {
  const { data } = useQuery(leadershipSummaryQuery(period));
  if (!data) return null;
  const rows: ProdiStats[] = data.prodi;
  return (
    <div className="mt-6 rounded-xl border bg-card shadow-card">
      <div className="border-b p-4">
        <h2 className="text-base font-semibold">Rincian per program studi</h2>
        <p className="text-xs text-muted-foreground">Nilai rata-rata hanya ditampilkan bila ada minimal 3 nilai, agar nilai perorangan tidak bisa ditebak.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Program studi</TableHead>
            <TableHead className="text-right">Mahasiswa</TableHead>
            <TableHead className="text-right">Modul terbit</TableHead>
            <TableHead className="text-right">Progres</TableHead>
            <TableHead className="text-right">Penyelesaian</TableHead>
            <TableHead className="text-right">Pre-test</TableHead>
            <TableHead className="text-right">Post-test</TableHead>
            <TableHead className="text-right">Pengajuan lab</TableHead>
            <TableHead className="text-right">Peminjaman</TableHead>
            <TableHead className="text-right">Terlambat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-right">{r.students}</TableCell>
              <TableCell className="text-right">{r.modules_published}/{r.modules_total}</TableCell>
              <TableCell className="text-right">{r.avg_progress != null ? `${r.avg_progress}%` : "—"}</TableCell>
              <TableCell className="text-right">{r.accessed ? `${pct(r.completed, r.accessed)}%` : "—"}</TableCell>
              <TableCell className="text-right">{score(r.pretest_avg, r.pretest_n)}</TableCell>
              <TableCell className="text-right">{score(r.posttest_avg, r.posttest_n)}</TableCell>
              <TableCell className="text-right">{sum(r.lab_requests)}</TableCell>
              <TableCell className="text-right">{sum(r.borrowings)}</TableCell>
              <TableCell className="text-right">{r.overdue}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
