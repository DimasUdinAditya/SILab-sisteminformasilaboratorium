"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Field<K extends string = string> = {
  key: K;
  label: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
};

export type Column<T> = { header: string; cell: (row: T) => ReactNode };

type Props<T extends { id: string }, K extends string> = {
  entity: string;
  rows: T[] | undefined;
  columns: Column<T>[];
  fields: Field<K>[];
  toForm: (row: T) => Record<K, string>;
  onSave: (values: Record<K, string>, id?: string) => Promise<{ message: string } | null>;
  onDelete: (id: string) => Promise<{ message: string; code?: string } | null>;
};

export function friendlyDbError(err: { message: string; code?: string }) {
  if (err.code === "23505") return "Data dengan kode/kombinasi yang sama sudah ada.";
  if (err.code === "23503") return "Data masih dipakai oleh data lain sehingga tidak bisa dihapus.";
  return err.message;
}

export function MasterTable<T extends { id: string }, K extends string>({
  entity,
  rows,
  columns,
  fields,
  toForm,
  onSave,
  onDelete,
}: Props<T, K>) {
  const [editing, setEditing] = useState<{ id?: string | undefined; values: Record<K, string> } | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, ""])) as Record<K, string>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    for (const f of fields)
      if (f.required && !editing.values[f.key]?.trim()) return void toast.error(`${f.label} wajib diisi.`);
    setSaving(true);
    const err = await onSave(editing.values, editing.id);
    setSaving(false);
    if (err) return void toast.error(friendlyDbError(err));
    toast.success(`${entity} berhasil disimpan.`);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const err = await onDelete(deleting.id);
    if (err) toast.error(friendlyDbError(err));
    else toast.success(`${entity} dihapus.`);
    setDeleting(null);
  }

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b p-4">
        <p className="text-sm text-muted-foreground">{rows?.length ?? 0} data</p>
        <Button size="sm" onClick={() => setEditing({ values: blank() })}>
          <Plus /> Tambah {entity}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header}>{c.header}</TableHead>
            ))}
            <TableHead className="w-24 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="py-10 text-center text-muted-foreground">
                Belum ada data.
              </TableCell>
            </TableRow>
          )}
          {rows?.map((r) => (
            <TableRow key={r.id}>
              {columns.map((c) => (
                <TableCell key={c.header}>{c.cell(r)}</TableCell>
              ))}
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" aria-label="Ubah" onClick={() => setEditing({ id: r.id, values: toForm(r) })}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => setDeleting(r)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Ubah" : "Tambah"} {entity}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="grid gap-4">
              {fields.map((f) => (
                <div key={f.key} className="grid gap-2">
                  <Label htmlFor={`f-${f.key}`}>
                    {f.label}
                    {!f.required && <span className="text-muted-foreground"> (opsional)</span>}
                  </Label>
                  {f.type === "select" ? (
                    <Select
                      value={editing.values[f.key] ?? ""}
                      onValueChange={(v) => setEditing({ ...editing, values: { ...editing.values, [f.key]: v } })}
                    >
                      <SelectTrigger id={`f-${f.key}`}>
                        <SelectValue placeholder={f.placeholder ?? `Pilih ${f.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`f-${f.key}`}
                      type={f.type === "number" ? "number" : "text"}
                      placeholder={f.placeholder}
                      value={editing.values[f.key] ?? ""}
                      onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })}
                    />
                  )}
                </div>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} Simpan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {entity.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
