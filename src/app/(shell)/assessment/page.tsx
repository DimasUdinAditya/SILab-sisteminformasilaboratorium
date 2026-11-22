"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Hourglass, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ASSESSMENT_LABELS, ATTEMPT_STATUS_META, formatDate, formatScore, passed } from "@/lib/vlab";
import { dosenAttemptsQuery } from "@/lib/vlab-queries";


export default function AssessmentListPage() {
  const { data: attempts, isLoading } = useQuery(dosenAttemptsQuery);
  const [status, setStatus] = useState("waiting_review");
  const [moduleId, setModuleId] = useState("all");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const modules = Array.from(
    new Map((attempts ?? []).flatMap((a) => (a.assessments?.modules ? [[a.assessments.modules.id, a.assessments.modules] as const] : []))).values(),
  );
  const waiting = (attempts ?? []).filter((a) => a.status === "waiting_review").length;
  const rows = (attempts ?? []).filter(
    (a) =>
      (status === "all" || a.status === status) &&
      (moduleId === "all" || a.assessments?.module_id === moduleId) &&
      (type === "all" || a.assessments?.type === type) &&
      (!q.trim() ||
        (a.profiles?.name ?? "").toLowerCase().includes(q.trim().toLowerCase()) ||
        (a.profiles?.nim_nip ?? "").includes(q.trim())),
  );

  return (
    <div>
      <PageHeader title="Assessment" description="Hasil pre-test dan post-test mahasiswa. Koreksi jawaban esai di sini." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Menunggu koreksi" value={attempts ? waiting : "…"} icon={Hourglass} />
        <StatCard label="Total dikumpulkan" value={attempts?.length ?? "…"} icon={ClipboardCheck} />
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIM" className="pl-9" aria-label="Cari mahasiswa" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="waiting_review">Menunggu koreksi</SelectItem>
            <SelectItem value="graded">Dinilai</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40" aria-label="Filter jenis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pre & post-test</SelectItem>
            <SelectItem value="pre_test">Pre-test</SelectItem>
            <SelectItem value="post_test">Post-test</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleId} onValueChange={setModuleId}>
          <SelectTrigger className="w-64" aria-label="Filter modul">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua modul</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mahasiswa</TableHead>
              <TableHead>Modul</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-center">Percobaan</TableHead>
              <TableHead>Dikumpulkan</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
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
                  {status === "waiting_review" ? "Tidak ada jawaban yang menunggu koreksi." : "Belum ada hasil."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((a) => {
              const lulus = passed(a.total_score, a.assessments?.passing_grade);
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="font-medium">{a.profiles?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.profiles?.nim_nip}</p>
                  </TableCell>
                  <TableCell className="text-sm">{a.assessments?.modules?.title}</TableCell>
                  <TableCell className="text-sm">{a.assessments && ASSESSMENT_LABELS[a.assessments.type]}</TableCell>
                  <TableCell className="text-center tabular-nums">{a.attempt_no}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(a.submitted_at, true)}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold tabular-nums">{formatScore(a.total_score)}</span>
                    {lulus != null && (
                      <span className={`ml-2 text-xs ${lulus ? "text-success" : "text-destructive"}`}>{lulus ? "Lulus" : "Belum lulus"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge {...ATTEMPT_STATUS_META[a.status]} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant={a.status === "waiting_review" ? "default" : "outline"}>
                      <Link to="/assessment/$attemptId" params={{ attemptId: a.id }}>
                        {a.status === "waiting_review" ? "Koreksi" : "Lihat"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
