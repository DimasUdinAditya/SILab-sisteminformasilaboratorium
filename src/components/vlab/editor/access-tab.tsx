import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActiveBadge } from "@/components/app/status-badge";
import { EmptyState, SectionCard, useEditorRefresh, type EditorModule } from "@/components/vlab/editor/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, formatDate } from "@/lib/vlab";
import { moduleAccessQuery, prodiStudentsQuery } from "@/lib/vlab-queries";

export function AccessTab({ module }: { module: EditorModule }) {
  const refresh = useEditorRefresh(module.id);
  const prodiId = module.courses?.program_study_id ?? "";
  const { data: access, isLoading, refetch } = useQuery(moduleAccessQuery(module.id));
  const { data: students } = useQuery({ ...prodiStudentsQuery(prodiId), enabled: !!prodiId });
  const [adding, setAdding] = useState(false);
  const [prodiOpen, setProdiOpen] = useState(false);
  const [q, setQ] = useState("");
  const has = new Set((access ?? []).map((a) => a.student_id));
  const candidates = (students ?? []).filter((s) => s.is_active && !has.has(s.id));

  async function grant(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase.from("module_access").insert(ids.map((id) => ({ module_id: module.id, student_id: id })));
    if (error) return void toast.error(errorMessage(error));
    toast.success(`${ids.length} mahasiswa mendapat akses.`);
    await refetch();
    await refresh(false);
  }

  async function revoke(id: string, name: string) {
    const { error } = await supabase.from("module_access").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    toast.success(`Akses ${name} dicabut.`);
    await refetch();
    await refresh(false);
  }

  const rows = (access ?? []).filter((a) => {
    const s = q.trim().toLowerCase();
    return !s || a.profiles?.name.toLowerCase().includes(s) || (a.profiles?.nim_nip ?? "").includes(s);
  });

  return (
    <SectionCard
      title="Akses mahasiswa"
      description="Saat Publish, semua mahasiswa aktif di prodi mata kuliah ini otomatis mendapat akses. Anda juga bisa menambah atau mencabut akses per mahasiswa."
      actions={
        <>
          <Button variant="outline" onClick={() => setProdiOpen(true)}>
            <Users /> Beri akses per prodi
          </Button>
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Tambah mahasiswa
          </Button>
        </>
      }
    >
      {module.status === "Draft" && (
        <p className="mb-4 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Modul masih Draft, jadi mahasiswa belum bisa melihatnya meskipun sudah punya akses.
        </p>
      )}
      <div className="relative mb-3 max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIM" className="pl-9" aria-label="Cari mahasiswa" />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : !access?.length ? (
        <EmptyState>Belum ada mahasiswa yang punya akses.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Status akun</TableHead>
                <TableHead>Akses sejak</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.profiles?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.profiles?.nim_nip ?? "—"}</TableCell>
                  <TableCell>{a.profiles && <ActiveBadge active={a.profiles.is_active} />}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(a.granted_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Cabut akses ${a.profiles?.name ?? ""}`}
                      onClick={() => revoke(a.id, a.profiles?.name ?? "mahasiswa")}
                    >
                      <UserMinus />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {prodiOpen && (
        <ProdiAccessDialog
          defaultProdiId={prodiId}
          existingIds={has}
          onClose={() => setProdiOpen(false)}
          onGranted={async (count) => {
            setProdiOpen(false);
            toast.success(`${count} mahasiswa mendapat akses.`);
            await refetch();
            await refresh(false);
          }}
          moduleId={module.id}
        />
      )}
      {adding && (
        <AddStudentsDialog
          candidates={candidates}
          onClose={() => setAdding(false)}
          onAdd={async (ids) => {
            await grant(ids);
            setAdding(false);
          }}
        />
      )}
    </SectionCard>
  );
}

/** Gives access to every active student of the chosen prodi who does not have it yet. */
function ProdiAccessDialog({
  moduleId,
  defaultProdiId,
  existingIds,
  onClose,
  onGranted,
}: {
  moduleId: string;
  defaultProdiId: string;
  existingIds: Set<string>;
  onClose: () => void;
  onGranted: (count: number) => Promise<void>;
}) {
  const { data: prodis, isLoading } = useQuery({
    queryKey: ["vlab", "prodi-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("program_studies").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [picked, setPicked] = useState<Set<string>>(() => new Set(defaultProdiId ? [defaultProdiId] : []));
  const [busy, setBusy] = useState(false);

  async function grant() {
    setBusy(true);
    const ids = [...picked];
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id, roles!inner(code)")
      .eq("roles.code", "mahasiswa")
      .eq("is_active", true)
      .in("program_study_id", ids);
    if (error) {
      setBusy(false);
      return void toast.error(errorMessage(error));
    }
    const newIds = (students ?? []).map((s) => s.id).filter((id) => !existingIds.has(id));
    if (newIds.length) {
      const { error: insErr } = await supabase
        .from("module_access")
        .insert(newIds.map((student_id) => ({ module_id: moduleId, student_id })));
      if (insErr) {
        setBusy(false);
        return void toast.error(errorMessage(insErr));
      }
    }
    setBusy(false);
    await onGranted(newIds.length);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Beri akses per prodi</DialogTitle>
          <DialogDescription>
            Pilih program studi. Mahasiswa aktif di prodi terpilih yang belum punya akses akan mendapatkannya.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {prodis?.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Checkbox
                checked={picked.has(p.id)}
                onCheckedChange={(v) =>
                  setPicked((cur) => {
                    const n = new Set(cur);
                    if (v === true) n.add(p.id);
                    else n.delete(p.id);
                    return n;
                  })
                }
              />
              <span className="text-sm font-medium">
                {p.name}
                {p.id === defaultProdiId && <span className="ml-2 text-xs text-muted-foreground">(prodi mata kuliah)</span>}
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={!picked.size || busy} onClick={grant}>
            {busy && <Loader2 className="animate-spin" />} Beri akses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddStudentsDialog({
  candidates,
  onClose,
  onAdd,
}: {
  candidates: { id: string; name: string; nim_nip: string | null }[];
  onClose: () => void;
  onAdd: (ids: string[]) => Promise<void>;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = candidates.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || c.name.toLowerCase().includes(s) || (c.nim_nip ?? "").includes(s);
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah akses mahasiswa</DialogTitle>
          <DialogDescription>Mahasiswa aktif di prodi mata kuliah ini yang belum punya akses.</DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIM" aria-label="Cari mahasiswa" />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada mahasiswa yang bisa ditambahkan.</p>}
          {list.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Checkbox
                checked={picked.has(c.id)}
                onCheckedChange={(v) =>
                  setPicked((p) => {
                    const n = new Set(p);
                    if (v === true) n.add(c.id);
                    else n.delete(c.id);
                    return n;
                  })
                }
              />
              <span className="text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-muted-foreground">{c.nim_nip}</span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!picked.size || busy}
            onClick={async () => {
              setBusy(true);
              await onAdd([...picked]);
              setBusy(false);
            }}
          >
            {busy && <Loader2 className="animate-spin" />} Beri akses ({picked.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
