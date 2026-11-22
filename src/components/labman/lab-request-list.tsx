"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { LabRequestBadge } from "@/components/labman/badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatTime, LAB_REQUEST_STATUSES } from "@/lib/labman";
import { labRequestsQuery } from "@/lib/labman-queries";

/** Request table; `manage` shows the requester column and links into the KaLab detail page. */
export function LabRequestList({ manage, defaultStatus = "all" }: { manage?: boolean; defaultStatus?: string }) {
  const { data, isLoading } = useQuery(labRequestsQuery);
  const [status, setStatus] = useState(defaultStatus);
  const [lab, setLab] = useState("all");
  const labs = Array.from(new Map((data ?? []).flatMap((r) => (r.laboratories ? [[r.laboratories.id, r.laboratories.name] as const] : []))));
  const rows = (data ?? []).filter((r) => (status === "all" || r.status === status) && (lab === "all" || r.laboratory_id === lab));

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {LAB_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {labs.length > 1 && (
          <Select value={lab} onValueChange={setLab}>
            <SelectTrigger className="w-60" aria-label="Filter laboratorium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua laboratorium</SelectItem>
              {labs.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} pengajuan</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal & jam</TableHead>
            <TableHead>Laboratorium</TableHead>
            {manage && <TableHead>Pemohon</TableHead>}
            <TableHead>Tujuan</TableHead>
            <TableHead>Status</TableHead>
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
          {data && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Belum ada pengajuan.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">
                <p className="font-medium">{formatDate(r.usage_date, { day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(r.start_time)}–{formatTime(r.end_time)}
                </p>
              </TableCell>
              <TableCell>{r.laboratories?.name}</TableCell>
              {manage && (
                <TableCell>
                  <p className="font-medium">{r.requester?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.requester?.roles?.name} {r.requester?.nim_nip ? `· ${r.requester.nim_nip}` : ""}
                  </p>
                </TableCell>
              )}
              <TableCell className="max-w-xs truncate">{r.purpose}</TableCell>
              <TableCell>
                <LabRequestBadge status={r.status} />
              </TableCell>
              <TableCell className="text-right">
                {manage ? (
                  <Link to="/pengajuan-lab/$id" params={{ id: r.id }} className="text-sm font-medium text-secondary hover:underline">
                    {r.status === "Diajukan" ? "Proses" : "Detail"}
                  </Link>
                ) : (
                  <Link to="/laboratorium/pengajuan/$id" params={{ id: r.id }} className="text-sm font-medium text-secondary hover:underline">
                    Detail
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
