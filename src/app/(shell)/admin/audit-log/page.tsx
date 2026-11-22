"use client";

import {  } from "@/lib/router-compat";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/labman";


const PAGE = 50;

const ENTITY_LABEL: Record<string, string> = {
  lab_usage_requests: "Pengajuan lab",
  equipment_borrowings: "Peminjaman",
  request_documents: "Surat resmi",
  borrowing_endorsements: "Pengesahan",
  profiles: "Akun",
  user_registrations: "Registrasi",
  kalab_signatures: "Tanda tangan",
};

type Log = { id: string; action: string; entity_type: string; entity_id: string | null; old_value: unknown; new_value: unknown; created_at: string; actor: { name: string; email: string } | null };

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<Log | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", page, action, from, to],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, old_value, new_value, created_at, actor:profiles!audit_logs_actor_id_fkey(name, email)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (action.trim()) q = q.ilike("action", `%${action.trim()}%`);
      if (from) q = q.gte("created_at", `${from}T00:00:00+07:00`);
      if (to) q = q.lte("created_at", `${to}T23:59:59+07:00`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data as Log[], count: count ?? 0 };
    },
  });
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));

  return (
    <div>
      <PageHeader title="Audit Log" description="Catatan aktivitas penting: persetujuan, penerbitan surat, pengesahan, dan perubahan akun." />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-card">
        <div className="space-y-1">
          <Label htmlFor="act" className="block">Aksi</Label>
          <Input id="act" placeholder="mis. approve" value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f" className="block">Dari tanggal</Label>
          <Input id="f" type="date" className="w-auto" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="t" className="block">Sampai tanggal</Label>
          <Input id="t" type="date" className="w-auto" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pelaku</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Objek</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Memuat…</TableCell></TableRow>
            )}
            {data?.rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada catatan.</TableCell></TableRow>
            )}
            {data?.rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(l.created_at)}</TableCell>
                <TableCell>{l.actor ? <><p className="font-medium">{l.actor.name}</p><p className="text-xs text-muted-foreground">{l.actor.email}</p></> : <span className="text-muted-foreground">Sistem</span>}</TableCell>
                <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.action}</code></TableCell>
                <TableCell>{ENTITY_LABEL[l.entity_type] ?? l.entity_type}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setDetail(l)}>Detail</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t p-3 text-sm text-muted-foreground">
          <span>{data?.count ?? 0} catatan · halaman {page + 1} dari {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Berikutnya</Button>
          </div>
        </div>
      </div>
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.action}</DialogTitle></DialogHeader>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="mb-1 font-medium">Sebelum</p><pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(detail?.old_value ?? null, null, 2)}</pre></div>
            <div><p className="mb-1 font-medium">Sesudah</p><pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(detail?.new_value ?? null, null, 2)}</pre></div>
          </div>
          <p className="text-xs text-muted-foreground">ID objek: {detail?.entity_id ?? "-"}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
