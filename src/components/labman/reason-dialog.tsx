"use client";

import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Dialog with a text field; when `required`, confirming needs a non-empty text. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  required,
  confirmLabel,
  destructive,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  required?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (text: string) => Promise<boolean>;
  children?: ReactNode;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const missing = required && !text.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (missing) return;
    setBusy(true);
    const ok = await onConfirm(text.trim());
    setBusy(false);
    if (ok) {
      setText("");
      setTouched(false);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <div className="space-y-2">
            <Label htmlFor="reason-text">
              {label}
              {!required && <span className="text-muted-foreground"> (opsional)</span>}
            </Label>
            <Textarea id="reason-text" rows={4} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
            {touched && missing && <p className="text-sm text-destructive">{label} wajib diisi.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
