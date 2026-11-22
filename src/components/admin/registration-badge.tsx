"use client";

import { StatusBadge } from "@/components/app/status-badge";
import type { Database } from "@/integrations/supabase/types";

export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];

const TONE = { Menunggu: "warning", Disetujui: "success", Ditolak: "danger" } as const;

export function RegistrationBadge({ status }: { status: RegistrationStatus }) {
  return <StatusBadge label={status} tone={TONE[status]} />;
}
