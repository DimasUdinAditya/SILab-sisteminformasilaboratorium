"use client";

import {  } from "@/lib/router-compat";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { ActiveBadge } from "@/components/app/status-badge";
import { SignatureSection } from "@/components/profile/signature-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { meQueryOptions } from "@/lib/profile";
import { nimNipLabel } from "@/lib/roles";


function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 font-medium">{value}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const [name, setName] = useState(me?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  if (!me) return null;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return void toast.error("Nama tidak boleh kosong.");
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", me!.id);
    setSavingName(false);
    if (error) return void toast.error("Gagal menyimpan nama.");
    await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
    toast.success("Nama berhasil diperbarui.");
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) return void toast.error("Password baru minimal 8 karakter.");
    if (pw.next !== pw.confirm) return void toast.error("Konfirmasi password tidak sama.");
    setSavingPw(true);
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: me!.email, password: pw.current });
    if (verifyErr) {
      setSavingPw(false);
      return void toast.error("Password saat ini salah.");
    }
    const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.current });
    setSavingPw(false);
    if (error) return void toast.error(error.message);
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Password berhasil diganti.");
  }

  return (
    <div>
      <PageHeader title="Profil Akun" description="Lihat data akun dan perbarui nama atau password Anda." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Data akun</h2>
          <dl className="mt-2 divide-y">
            <Row label="Email" value={me.email} />
            <Row label="Role" value={me.roleName} />
            <Row label="Program studi" value={me.prodi ? `${me.prodi.code} · ${me.prodi.name}` : "-"} />
            <Row label={nimNipLabel(me.role)} value={me.nim_nip || "-"} />
            {me.role === "mahasiswa" && <Row label="Semester" value={me.semester ?? "-"} />}
            <Row label="Status" value={<ActiveBadge active={me.is_active} />} />
          </dl>
          <form onSubmit={saveName} className="mt-4 space-y-2 border-t pt-4">
            <Label htmlFor="name">Nama lengkap</Label>
            <div className="flex gap-2">
              <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" disabled={savingName || name.trim() === me.name}>
                {savingName && <Loader2 className="animate-spin" />} Simpan
              </Button>
            </div>
          </form>
        </section>
        <section className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Ganti password</h2>
          <form onSubmit={savePassword} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cur">Password saat ini</Label>
              <Input id="cur" type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Password baru</Label>
              <Input id="new" type="password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Konfirmasi password baru</Label>
              <Input id="conf" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
            <Button type="submit" disabled={savingPw}>
              {savingPw && <Loader2 className="animate-spin" />} Ganti password
            </Button>
          </form>
        </section>
        {(me.role === "kalab" || me.role === "dekan") && <SignatureSection meId={me.id} role={me.role} />}
      </div>
    </div>
  );
}
