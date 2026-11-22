"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { ImportUsersDialog } from "@/components/admin/import-users-dialog";
import { PageHeader } from "@/components/app/page-header";
import { ActiveBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usersQuery } from "@/lib/admin-queries";
import { APP_ROLES, ROLE_LABELS } from "@/lib/roles";


export default function UsersPage() {
  const { data: users, isLoading } = useQuery(usersQuery);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (users ?? []).filter(
      (u) =>
        (role === "all" || u.roles?.code === role) &&
        (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.nim_nip ?? "").includes(s)),
    );
  }, [users, q, role]);

  return (
    <div>
      <PageHeader
        title="Manajemen Pengguna"
        description="Tambah, import, dan kelola akun seluruh pengguna SiLab."
        actions={
          <>
            <ImportUsersDialog />
            <AddUserDialog />
          </>
        }
      />
      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama, email, atau NIM/NIP" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua role</SelectItem>
              {APP_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>NIM / NIP</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Prodi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada pengguna yang cocok.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{u.nim_nip || "-"}</TableCell>
                <TableCell>{u.roles?.name}</TableCell>
                <TableCell>{u.program_studies?.code ?? "-"}</TableCell>
                <TableCell>
                  <ActiveBadge active={u.is_active} />
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/pengguna/$id" params={{ id: u.id }}>
                      Detail
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          Menampilkan {filtered.length} dari {users?.length ?? 0} pengguna
        </p>
      </div>
    </div>
  );
}
