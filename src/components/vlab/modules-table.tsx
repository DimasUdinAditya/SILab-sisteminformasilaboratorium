import { Link } from "@/lib/router-compat";

import { StatusBadge } from "@/components/app/status-badge";
import { ModuleRowActions } from "@/components/vlab/module-row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, MODULE_STATUS_META, type ModuleStatus } from "@/lib/vlab";

export type ModuleRow = {
  id: string;
  title: string;
  status: ModuleStatus;
  updated_at: string;
  courses: { code: string; name: string } | null;
  module_access: { count: number }[];
};

export function ModulesTable({ rows, showCourse = true }: { rows: ModuleRow[]; showCourse?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Judul modul</TableHead>
            {showCourse && <TableHead>Mata kuliah</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Mahasiswa</TableHead>
            <TableHead>Diperbarui</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                Belum ada modul.
              </TableCell>
            </TableRow>
          )}
          {rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Link to="/kelola-modul/$id" params={{ id: m.id }} className="font-medium text-foreground hover:text-secondary hover:underline">
                  {m.title}
                </Link>
              </TableCell>
              {showCourse && (
                <TableCell className="text-sm text-muted-foreground">
                  {m.courses?.code} · {m.courses?.name}
                </TableCell>
              )}
              <TableCell>
                <StatusBadge {...MODULE_STATUS_META[m.status]} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{m.module_access[0]?.count ?? 0}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(m.updated_at, true)}</TableCell>
              <TableCell>
                <ModuleRowActions id={m.id} title={m.title} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
