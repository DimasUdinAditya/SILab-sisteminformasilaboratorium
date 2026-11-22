"use client";

import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

export const TAGLINE = "Sistem Informasi Laboratorium — Fakultas Ilmu Kesehatan";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hero text-primary-foreground shadow-elevated">
        <FlaskConical className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-base font-extrabold tracking-tight text-secondary">SiLab</p>
          <p className="text-[11px] text-muted-foreground">Sistem Informasi Laboratorium</p>
        </div>
      )}
    </div>
  );
}
