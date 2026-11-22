"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { LabFormDialog } from "@/components/labman/lab-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { labsQuery } from "@/lib/labman-queries";

type Lab = NonNullable<Awaited<ReturnType<NonNullable<typeof labsQuery.queryFn>>>>[number];

export default function MasterLabPage() {
  const { data: labs, isLoading } = useQuery(labsQuery);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Lab | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Lab | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_laboratory", { _id: toDelete.id });
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Laboratorium "${toDelete.name}" dihapus.`);
    setToDelete(null);
    await queryClient.invalidateQueries({ queryKey: labsQuery.queryKey });
  }

  return (
    <div>
      <PageHeader
        title="Master Data Laboratorium"
        description="Daftar laboratorium, program studi, dan kepala laboratorium yang bertanggung jawab."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Tambah Laboratorium
          </Button>
        }
      />
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Program studi</TableHead>
              <TableHead>Kepala laboratorium</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-right">Kapasitas</TableHead>
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
            {labs && labs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada laboratorium.
                </TableCell>
              </TableRow>
            )}
            {labs?.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.program_studies ? `${l.program_studies.code} · ${l.program_studies.name}` : "-"}</TableCell>
                <TableCell>{l.kalab?.name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{l.location ?? "-"}</TableCell>
                <TableCell className="text-right">{l.capacity ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Ubah ${l.name}`}
                      onClick={() => {
                        setEditing(l);
                        setOpen(true);
                      }}
                    >
                      <Pencil /> Ubah
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Hapus ${l.name}`} onClick={() => setToDelete(l)}>
                      <Trash2 /> Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <LabFormDialog open={open} onOpenChange={setOpen} lab={editing} admin />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus laboratorium?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name} akan dihapus. Penghapusan ditolak jika laboratorium sudah punya riwayat pemakaian atau
              peminjaman, atau masih memiliki inventaris.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" />} Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
