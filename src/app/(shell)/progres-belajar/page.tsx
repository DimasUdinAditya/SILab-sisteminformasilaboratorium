"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, BookOpenCheck, ClipboardCheck, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatScore, STEP_LABELS, summarizeStudentModules as rowsOf, type LearnStep } from "@/lib/vlab";
import { studentModulesQuery } from "@/lib/vlab-queries";


export default function ProgressPage() {
  const { data: modules, isLoading } = useQuery(studentModulesQuery);
  const rows = rowsOf(modules ?? []);
  const done = rows.filter((r) => r.status.label === "Selesai").length;
  const avgPct = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : null;
  const posts = rows.flatMap((r) => (r.post == null ? [] : [r.post]));
  const avgPost = posts.length ? Math.round((posts.reduce((a, b) => a + b, 0) / posts.length) * 10) / 10 : null;

  return (
    <div>
      <PageHeader title="Progres Belajar" description="Ringkasan progres dan nilai Anda di setiap modul praktikum." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Modul tersedia" value={modules ? rows.length : "…"} icon={BookOpen} />
        <StatCard label="Modul selesai" value={modules ? done : "…"} icon={BookOpenCheck} />
        <StatCard label="Rata-rata progres" value={avgPct == null ? "—" : `${avgPct}%`} icon={TrendingUp} />
        <StatCard label="Rata-rata post-test" value={formatScore(avgPost)} icon={ClipboardCheck} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modul</TableHead>
              <TableHead className="w-56">Progres</TableHead>
              <TableHead>Tahap berikutnya</TableHead>
              <TableHead className="text-right">Pre-test</TableHead>
              <TableHead className="text-right">Post-test</TableHead>
              <TableHead>Terakhir dibuka</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Belum ada modul untuk Anda.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.courses?.code} · {r.courses?.name}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={r.pct} className="h-2" aria-label={`Progres ${r.title}`} />
                    <span className="w-10 text-right text-xs tabular-nums">{Math.round(r.pct)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.status.label === "Selesai" ? "—" : STEP_LABELS[r.step as LearnStep]}</TableCell>
                <TableCell className="text-right tabular-nums">{formatScore(r.pre)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatScore(r.post)}
                  {r.waiting && <span className="ml-1 text-xs text-warning">(menunggu koreksi)</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.p?.last_accessed_at, true)}</TableCell>
                <TableCell>
                  <StatusBadge {...r.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/modul-praktikum/$id/belajar" params={{ id: r.id }} search={{ step: r.step }}>
                      {r.status.label === "Selesai" ? "Ringkasan" : r.p ? "Lanjutkan" : "Mulai"}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
