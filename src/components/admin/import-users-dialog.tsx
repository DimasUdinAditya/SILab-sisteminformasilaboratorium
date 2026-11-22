"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { importUsers } from "@/lib/admin.actions";
import { usersQuery } from "@/lib/admin-queries";
import { CSV_COLUMNS, CSV_OPTIONAL_COLUMNS, parseUsersCsv, type RowFailure, type UserRow } from "@/lib/user-import";

type Result = { success: number; failed: number; failures: RowFailure[] };

export function ImportUsersDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const run = useServerFn(importUsers);
  const queryClient = useQueryClient();

  function reset() {
    setRows([]);
    setFileError(null);
    setPassword("");
    setResult(null);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = parseUsersCsv(await file.text());
    setFileError(parsed.error ?? (parsed.rows.length > 500 ? "Maksimal 500 baris per file." : null));
    setRows(parsed.rows);
  }

  async function submit() {
    if (password.length < 8) return void toast.error("Password awal minimal 8 karakter.");
    setLoading(true);
    try {
      const res = await run({ data: { rows, password } });
      setResult(res);
      await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), !o && reset())}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import pengguna dari CSV</DialogTitle>
          <DialogDescription>
            Kolom wajib: <code className="rounded bg-muted px-1">{CSV_COLUMNS.join(",")}</code>. Kolom opsional:{" "}
            <code className="rounded bg-muted px-1">{CSV_OPTIONAL_COLUMNS.join(",")}</code> (untuk mahasiswa). Role yang
            didukung termasuk <code className="rounded bg-muted px-1">dekan</code>. Email yang sudah
            terdaftar atau duplikat akan ditolak.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-success-soft p-4 text-success">
                <CheckCircle2 className="mb-1 size-5" />
                <p className="font-display text-2xl font-bold">{result.success}</p>
                <p className="text-xs">Berhasil</p>
              </div>
              <div className="rounded-lg bg-danger-soft p-4 text-destructive">
                <XCircle className="mb-1 size-5" />
                <p className="font-display text-2xl font-bold">{result.failed}</p>
                <p className="text-xs">Gagal</p>
              </div>
            </div>
            {result.failures.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-lg border text-sm">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.failures.map((f) => (
                      <tr key={f.line}>
                        <td className="px-3 py-2">{f.line}</td>
                        <td className="px-3 py-2">{f.email || "-"}</td>
                        <td className="px-3 py-2 text-destructive">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Import file lain
              </Button>
              <Button onClick={() => setOpen(false)}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="csv">File CSV</Label>
              <Input id="csv" type="file" accept=".csv,text/csv" onChange={onFile} />
              {rows.length > 0 && !fileError && (
                <p className="text-xs text-muted-foreground">{rows.length} baris data siap diimport.</p>
              )}
            </div>
            {fileError && (
              <Alert variant="destructive">
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="csv-pass">Password awal untuk semua akun di file ini</Label>
              <Input id="csv-pass" type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
              <p className="text-xs text-muted-foreground">Pengguna dapat menggantinya di Profil Akun atau lewat Lupa Password.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={submit} disabled={loading || rows.length === 0 || !!fileError}>
                {loading && <Loader2 className="animate-spin" />} Import {rows.length > 0 ? `${rows.length} baris` : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
