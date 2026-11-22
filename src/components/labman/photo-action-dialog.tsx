"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { PhotoField } from "@/components/labman/photo-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Dialog that requires one photo (plus optional note) before the action can run. */
export function PhotoActionDialog({
  open,
  onOpenChange,
  title,
  description,
  photoLabel,
  confirmLabel,
  ready = true,
  children,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  photoLabel: string;
  confirmLabel: string;
  ready?: boolean;
  children?: ReactNode;
  onSubmit: (file: File, note: string) => Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (open) {
      setFile(null);
      setNote("");
      setTried(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!file || !ready) return;
    setBusy(true);
    const ok = await onSubmit(file, note.trim());
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <div className="space-y-2">
            <Label>Foto (wajib)</Label>
            <PhotoField file={file} onChange={setFile} label={photoLabel} />
            {tried && !file && <p className="text-sm text-destructive">Foto wajib diunggah.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pa-note">
              Catatan <span className="text-muted-foreground">(opsional)</span>
            </Label>
            <Textarea id="pa-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy || (tried && !ready)}>
              {busy && <Loader2 className="animate-spin" />} {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
