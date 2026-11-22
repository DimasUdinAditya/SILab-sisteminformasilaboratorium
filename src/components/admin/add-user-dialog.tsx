"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Loader2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser } from "@/lib/admin.actions";
import { prodisQuery, usersQuery } from "@/lib/admin-queries";
import { APP_ROLES, nimNipLabel, ROLE_LABELS, ROLES_REQUIRING_PRODI, type AppRole } from "@/lib/roles";

const empty = { name: "", email: "", role: "mahasiswa" as AppRole, nim_nip: "", prodi_code: "", semester: "", password: "" };

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const { data: prodis } = useQuery(prodisQuery);
  const create = useServerFn(createUser);
  const queryClient = useQueryClient();
  const needsProdi = ROLES_REQUIRING_PRODI.includes(form.role);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (needsProdi && !form.prodi_code) return void toast.error("Pilih program studi untuk role ini.");
    setLoading(true);
    try {
      await create({ data: form });
      toast.success(`Pengguna ${form.name} berhasil dibuat.`);
      await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
      setForm(empty);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pengguna.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah pengguna</DialogTitle>
          <DialogDescription>Akun langsung aktif dan bisa masuk dengan password awal ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="u-name">Nama lengkap</Label>
            <Input id="u-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole, semester: v === "mahasiswa" ? form.semester : "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-nim">{nimNipLabel(form.role)}</Label>
              <Input id="u-nim" maxLength={40} value={form.nim_nip} onChange={(e) => setForm({ ...form, nim_nip: e.target.value })} />
            </div>
          </div>
          {form.role === "mahasiswa" && (
            <div className="grid gap-2">
              <Label htmlFor="u-sem">Semester</Label>
              <Input id="u-sem" type="number" min={1} max={14} className="w-28" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Program studi {needsProdi ? "" : "(opsional)"}</Label>
            <Select value={form.prodi_code || "none"} onValueChange={(v) => setForm({ ...form, prodi_code: v === "none" ? "" : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih program studi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tidak ada</SelectItem>
                {prodis?.map((p) => (
                  <SelectItem key={p.id} value={p.code}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="u-pass">Password awal</Label>
            <Input id="u-pass" type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 8 karakter" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
