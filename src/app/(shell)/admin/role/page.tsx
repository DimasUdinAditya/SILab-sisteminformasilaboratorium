"use client";

import {  } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { usersQuery } from "@/lib/admin-queries";
import { APP_ROLES } from "@/lib/roles";


export default function RolesPage() {
  const { data: roles } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*");
      if (error) throw error;
      return [...data].sort((a, b) => APP_ROLES.indexOf(a.code) - APP_ROLES.indexOf(b.code));
    },
  });
  const { data: users } = useQuery(usersQuery);
  const count = (code: string) => users?.filter((u) => u.roles?.code === code).length ?? 0;

  return (
    <div>
      <PageHeader title="Manajemen Role" description="Daftar role yang tersedia. Satu akun memiliki satu role." />
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama role</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Jumlah pengguna</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <StatusBadge label={r.code} tone="info" />
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.description || "-"}</TableCell>
                <TableCell className="text-right font-display font-semibold">{count(r.code)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
