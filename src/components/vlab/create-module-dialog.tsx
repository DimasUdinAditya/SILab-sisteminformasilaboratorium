import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router-compat";
import { Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { meQueryOptions } from "@/lib/profile";
import { DEFAULT_STEPS, errorMessage } from "@/lib/vlab";
import { lecturerCoursesQuery } from "@/lib/vlab-queries";

export function CreateModuleDialog({ courseId }: { courseId?: string }) {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: assignments } = useQuery(lecturerCoursesQuery(me!.id));
  const courses = Array.from(
    new Map((assignments ?? []).flatMap((a) => (a.courses ? [[a.courses.id, a.courses] as const] : []))).values(),
  );
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState(courseId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return void toast.error("Pilih mata kuliah.");
    if (!title.trim()) return void toast.error("Judul modul wajib diisi.");
    setBusy(true);
    const { data, error } = await supabase
      .from("modules")
      .insert({
        course_id: course,
        lecturer_id: me!.id,
        title: title.trim(),
        description: description.trim() || null,
        step_order: DEFAULT_STEPS,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Modul dibuat sebagai Draft.");
    await qc.invalidateQueries({ queryKey: ["vlab"] });
    setOpen(false);
    navigate({ to: "/kelola-modul/$id", params: { id: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Buat Modul
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Buat modul praktikum</DialogTitle>
            <DialogDescription>Modul disimpan sebagai Draft. Isi materi dan assessment di halaman berikutnya.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Mata kuliah</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger aria-label="Mata kuliah">
                <SelectValue placeholder="Pilih mata kuliah" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignments && courses.length === 0 && (
              <p className="text-xs text-destructive">Anda belum ditugaskan ke mata kuliah mana pun.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-title">Judul modul</Label>
            <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="mis. Pengukuran Tanda-Tanda Vital" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-desc">Deskripsi singkat</Label>
            <Textarea id="m-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Simpan Draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
