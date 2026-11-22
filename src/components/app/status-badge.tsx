"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

/** Status is always shown as text + color, never color alone. */
export function StatusBadge({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  return (
    <Badge variant={tone} className={cn("gap-1.5 font-medium", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <StatusBadge label="Aktif" tone="success" /> : <StatusBadge label="Nonaktif" tone="neutral" />;
}
