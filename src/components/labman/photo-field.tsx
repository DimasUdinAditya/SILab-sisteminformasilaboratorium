"use client";

import { FileText, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_LAB_FILE_MB, validateLabFile } from "@/lib/labman";

/** Picks one photo (or PDF for documents), validates type/size and previews it before upload. */
export function PhotoField({
  file,
  onChange,
  kind = "photo",
  label,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  kind?: "photo" | "document";
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return void setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    if (input.current) input.current.value = "";
    if (!f) return;
    const err = validateLabFile(f, kind);
    setError(err);
    onChange(err ? null : f);
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        aria-label={label}
        accept={kind === "photo" ? "image/jpeg,image/png" : "image/jpeg,image/png,application/pdf"}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {file ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted">
          {preview ? (
            <img src={preview} alt="Pratinjau" className="max-h-64 w-full object-contain" />
          ) : (
            <p className="flex items-center gap-2 p-4 text-sm">
              <FileText className="size-4" /> {file.name}
            </p>
          )}
          <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 size-8" aria-label="Hapus file" onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ImagePlus className="size-6" />
          <span className="font-medium">{label}</span>
          <span className="text-xs">
            {kind === "photo" ? "JPG atau PNG" : "JPG, PNG, atau PDF"} · maks {MAX_LAB_FILE_MB} MB
          </span>
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
