import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Counts = Record<string, number>;

export type ProdiStats = {
  id?: string;
  code?: string;
  name?: string;
  students: number;
  labs: number;
  modules_total: number;
  modules_published: number;
  module_access: number;
  accessed: number;
  completed: number;
  avg_progress: number | null;
  posttest_n: number;
  posttest_avg: number | null;
  pretest_n: number;
  pretest_avg: number | null;
  lab_requests: Counts;
  borrowings: Counts;
  overdue: number;
};

export type LeadershipSummary = {
  scope: "prodi" | "fakultas";
  role: string;
  prodi: ProdiStats[];
  totals: ProdiStats;
  endorsements: null | {
    pending: number;
    endorsed: number;
    endorsed_in_period: number;
    lab_usage: number;
    borrowing: number;
    avg_days: number | null;
  };
};

export type LabOps = {
  id: string;
  name: string;
  location: string | null;
  lab_requests: Counts;
  borrowings: Counts;
  overdue: number;
  sessions: number;
  equipment_types: number;
  equipment_units: number;
  equipment_available: number;
  calibration: Counts;
  consumables: number;
  low_stock: { name: string; stock: number; min: number; unit: string }[];
  top_items: { name: string; type: string; qty: number }[];
};

export type Period = { from: string | null; to: string | null };

const args = (p: Period) => ({ ...(p.from ? { _from: p.from } : {}), ...(p.to ? { _to: p.to } : {}) });

export const leadershipSummaryQuery = (p: Period) =>
  queryOptions({
    queryKey: ["summary", "leadership", p.from, p.to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leadership_summary", args(p));
      if (error) throw error;
      return data as unknown as LeadershipSummary;
    },
  });

export const labOpsQuery = (p: Period) =>
  queryOptions({
    queryKey: ["summary", "labops", p.from, p.to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("lab_operations_summary", args(p));
      if (error) throw error;
      return (data as unknown as { labs: LabOps[] }).labs;
    },
  });

export const sum = (c: Counts | undefined, keys?: string[]) =>
  Object.entries(c ?? {}).reduce((a, [k, v]) => (!keys || keys.includes(k) ? a + v : a), 0);

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export const ACTIVE_BORROWING = ["Disetujui", "Dipinjam", "Dikembalikan", "Ditunggu"];

/** Current month as an ISO date range in local time. */
export function thisMonth(): Period {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, to: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}` };
}
