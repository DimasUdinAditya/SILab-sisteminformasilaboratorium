"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { ActiveBadge } from "@/components/app/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { setUserActive } from "@/lib/admin.actions";
import { usersQuery } from "@/lib/admin-queries";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { meQueryOptions } from "@/lib/profile";


function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 font-medium">{value}</dd>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const { data: users, isLoading } = useQuery(usersQuery);
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const toggle = useServerFn(setUserActive);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const user = users?.find((u) => u.id === id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!user)
    return (
      <div>
        <PageHeader title="Pengguna tidak ditemukan" />
        <Button asChild variant="outline">
          <Link to="/admin/pengguna">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
      </div>
    );

  const isSelf = me?.id === user.id;

  async function onToggle() {
    setBusy(true);
    try {
      await toggle({ data: { userId: user!.id, active: !user!.is_active } });
      await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
      toast.success(user!.is_active ? "Pengguna dinonaktifkan." : "Pengguna diaktifkan kembali.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          <div className="flex gap-2">
          <EditUserDialog user={user} />
          <Button asChild variant="outline">
            <Link to="/admin/pengguna">
              <ArrowLeft /> Kembali
            </Link>
          </Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Data pengguna</h2>
          <dl className="mt-2 divide-y">
            <Row label="Nama" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Role" value={user.roles?.name} />
            <Row label="Program studi" value={user.program_studies ? `${user.program_studies.code} · ${user.program_studies.name}` : "-"} />
            <Row label="NIM / NIP" value={user.nim_nip || "-"} />
            <Row label="Dibuat" value={new Date(user.created_at).toLocaleString("id-ID")} />
            <Row label="Status" value={<ActiveBadge active={user.is_active} />} />
          </dl>
        </section>
        <section className="h-fit rounded-xl border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Status akun</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {user.is_active
              ? "Pengguna nonaktif tidak dapat masuk ke SiLab sampai diaktifkan kembali."
              : "Akun ini sedang nonaktif dan tidak dapat digunakan untuk masuk."}
          </p>
          {isSelf ? (
            <p className="mt-4 text-xs text-muted-foreground">Anda tidak dapat menonaktifkan akun sendiri.</p>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="mt-4 w-full" variant={user.is_active ? "destructive" : "default"} disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {user.is_active ? "Nonaktifkan pengguna" : "Aktifkan kembali"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{user.is_active ? "Nonaktifkan pengguna?" : "Aktifkan pengguna?"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.is_active
                      ? `${user.name} tidak akan bisa masuk sampai diaktifkan kembali.`
                      : `${user.name} akan bisa masuk kembali.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onToggle}>Ya, lanjutkan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>
      </div>
    </div>
  );
}
