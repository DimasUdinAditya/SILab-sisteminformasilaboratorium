"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { RegistrationBadge } from "@/components/admin/registration-badge";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registrationsQuery } from "@/lib/admin-queries";


const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export default function RegistrationsPage() {
  const { data, isLoading } = useQuery(registrationsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Menunggu");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!s ||
          r.full_name.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.nim_nip.toLowerCase().includes(s)),
    );
  }, [data, q, status]);

  return (
    <div>
      <PageHeader
        title="Persetujuan Registrasi"
        description="Periksa akun yang mendaftar sendiri, lalu setujui atau tolak."
      />
      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama, email, atau NIM/NIP" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" aria-label="Filter status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Menunggu">Menunggu</SelectItem>
              <SelectItem value="Disetujui">Disetujui</SelectItem>
              <SelectItem value="Ditolak">Ditolak</SelectItem>
              <SelectItem value="all">Semua status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Role diajukan</TableHead>
              <TableHead>NIM/NIP</TableHead>
              <TableHead>Program studi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada registrasi{status !== "all" ? ` berstatus ${status}` : ""}.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </TableCell>
                  <TableCell>{r.roles?.name ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{r.nim_nip}</TableCell>
                  <TableCell>{r.program_studies?.name ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(r.submitted_at)}</TableCell>
                  <TableCell>
                    <RegistrationBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/registrasi/$id" params={{ id: r.id }}>
                        Detail
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
