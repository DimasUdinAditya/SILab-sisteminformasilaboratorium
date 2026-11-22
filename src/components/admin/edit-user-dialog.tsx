"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
import { updateUser } from "@/lib/admin.actions";
import { usersQuery, prodisQuery } from "@/lib/admin-queries";
import { APP_ROLES, nimNipLabel, ROLE_LABELS, ROLES_REQUIRING_PRODI, type AppRole } from "@/lib/roles";

type EditableUser = {
  id: string;
  name: string;
  nim_nip: string | null;
  program_study_id: string | null;
  semester: number | null;
  roles: { code: string } | null;
};

export function EditUserDialog({ user }: { user: EditableUser }) {
  const queryClient = useQueryClient();
  const { data: prodis } = useQuery(prodisQuery);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    nim_nip: user.nim_nip ?? "",
    role: (user.roles?.code ?? "mahasiswa") as AppRole,
    program_study_id: user.program_study_id ?? "",
    semester: user.semester ? String(user.semester) : "",
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setForm({
        name: user.name,
        nim_nip: user.nim_nip ?? "",
        role: (user.roles?.code ?? "mahasiswa") as AppRole,
        program_study_id: user.program_study_id ?? "",
        semester: user.semester ? String(user.semester) : "",
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateUser({
        userId: user.id,
        name: form.name,
        nim_nip: form.nim_nip,
        role: form.role,
        program_study_id: form.program_study_id || null,
        semester: form.role === "mahasiswa" && form.semester ? Number(form.semester) : null,
      });
      await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
      toast.success("Data pengguna diperbarui.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setBusy(false);
    }
  }

  const needsProdi = ROLES_REQUIRING_PRODI.includes(form.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Ubah data</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Ubah data pengguna</DialogTitle>
            <DialogDescription>Email dan status akun diubah dari menu lain.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="e-name">Nama lengkap</Label>
            <Input id="e-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
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
            <div className="space-y-2">
              <Label htmlFor="e-nim">{nimNipLabel(form.role)}</Label>
              <Input id="e-nim" maxLength={40} value={form.nim_nip} onChange={(e) => setForm({ ...form, nim_nip: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Program studi{needsProdi ? "" : " (opsional)"}</Label>
            <Select value={form.program_study_id || "none"} onValueChange={(v) => setForm({ ...form, program_study_id: v === "none" ? "" : v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!needsProdi && <SelectItem value="none">Tidak ada</SelectItem>}
                {(prodis ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.role === "mahasiswa" && (
            <div className="space-y-2">
              <Label htmlFor="e-sem">Semester</Label>
              <Input id="e-sem" type="number" min={1} max={14} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
