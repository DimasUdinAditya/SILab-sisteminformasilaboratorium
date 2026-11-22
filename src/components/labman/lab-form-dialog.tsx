"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { prodisQuery } from "@/lib/admin-queries";
import { labError } from "@/lib/labman";

type Lab = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  description: string | null;
  program_study_id: string;
  kalab_id: string;
};

const kalabsQuery = {
  queryKey: ["master", "kalabs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, roles!inner(code)")
      .eq("roles.code", "kalab")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data;
  },
};

/** Super Admin edits everything; KaLab edits only the descriptive fields of their own lab. */
export function LabFormDialog({
  open,
  onOpenChange,
  lab,
  admin,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lab: Lab | null;
  admin?: boolean;
}) {
  const qc = useQueryClient();
  const { data: prodis } = useQuery({ ...prodisQuery, enabled: !!admin && open });
  const { data: kalabs } = useQuery({ ...kalabsQuery, enabled: !!admin && open });
  const [f, setF] = useState({ name: "", location: "", capacity: "", description: "", prodi: "", kalab: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open)
      setF({
        name: lab?.name ?? "",
        location: lab?.location ?? "",
        capacity: lab?.capacity?.toString() ?? "",
        description: lab?.description ?? "",
        prodi: lab?.program_study_id ?? "",
        kalab: lab?.kalab_id ?? "",
      });
  }, [open, lab]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return void toast.error("Nama laboratorium wajib diisi.");
    if (admin && (!f.prodi || !f.kalab)) return void toast.error("Pilih program studi dan kepala laboratorium.");
    const capacity = f.capacity.trim() ? Number(f.capacity) : null;
    if (capacity != null && (!Number.isInteger(capacity) || capacity < 0)) return void toast.error("Kapasitas harus bilangan bulat.");
    setBusy(true);
    const { error } = await supabase.rpc("save_laboratory", {
      _id: (lab?.id ?? null) as string,
      _name: f.name,
      _location: f.location,
      _capacity: capacity as number,
      _description: f.description,
      _program_study_id: (admin ? f.prodi : null) as string,
      _kalab_id: (admin ? f.kalab : null) as string,
    });
    setBusy(false);
    if (error) return void toast.error(labError(error));
    toast.success("Data laboratorium disimpan.");
    await qc.invalidateQueries({ queryKey: ["labman"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{lab ? "Ubah data laboratorium" : "Tambah laboratorium"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lab-name">Nama laboratorium</Label>
            <Input id="lab-name" value={f.name} maxLength={150} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="lab-loc">Lokasi</Label>
              <Input id="lab-loc" value={f.location} maxLength={150} onChange={(e) => setF({ ...f, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-cap">Kapasitas</Label>
              <Input id="lab-cap" type="number" min={0} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
            </div>
          </div>
          {admin && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Program studi</Label>
                <Select value={f.prodi} onValueChange={(v) => setF({ ...f, prodi: v })}>
                  <SelectTrigger aria-label="Program studi">
                    <SelectValue placeholder="Pilih prodi" />
                  </SelectTrigger>
                  <SelectContent>
                    {prodis?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kepala laboratorium</Label>
                <Select value={f.kalab} onValueChange={(v) => setF({ ...f, kalab: v })}>
                  <SelectTrigger aria-label="Kepala laboratorium">
                    <SelectValue placeholder="Pilih KaLab" />
                  </SelectTrigger>
                  <SelectContent>
                    {kalabs?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {kalabs?.length === 0 && <p className="text-xs text-destructive">Belum ada akun Kepala Laboratorium aktif.</p>}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="lab-desc">Deskripsi</Label>
            <Textarea id="lab-desc" rows={3} maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
