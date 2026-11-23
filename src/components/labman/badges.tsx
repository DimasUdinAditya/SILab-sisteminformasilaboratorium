"use client";

import { AlarmClock } from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import {
  BORROWING_STATUS_META,
  calibrationState,
  LAB_REQUEST_STATUS_META,
  type BorrowingStatus,
  type ItemType,
  type LabRequestStatus,
} from "@/lib/labman";
import { Badge } from "@/components/ui/badge";

export function LabRequestBadge({ status }: { status: LabRequestStatus }) {
  const m = LAB_REQUEST_STATUS_META[status];
  return <StatusBadge label={m.label} tone={m.tone} />;
}

export function BorrowingBadge({ status }: { status: BorrowingStatus }) {
  const m = BORROWING_STATUS_META[status];
  // Diajukan dibuat abu-abu: teks abu tua di atas latar abu muda.
  if (status === "Diajukan") return <StatusBadge label={m.label} tone="neutral" className="text-foreground/75" />;
  return <StatusBadge label={m.label} tone={m.tone} />;
}

export function OverdueBadge() {
  return (
    <Badge variant="danger" className="gap-1 font-medium">
      <AlarmClock className="size-3" /> Overdue
    </Badge>
  );
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  return <StatusBadge label={type} tone={type === "Alat" ? "info" : "neutral"} />;
}

export function CalibrationBadge({ requires, next }: { requires: boolean; next: string | null }) {
  const s = calibrationState(requires, next);
  return <StatusBadge label={s.label} tone={s.tone} />;
}
