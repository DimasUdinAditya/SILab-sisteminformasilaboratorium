import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const LAB = "id, name, location, capacity, description, program_study_id, kalab_id, program_studies(code, name), kalab:profiles!laboratories_kalab_id_fkey(id, name)";
const ITEMS = "id, item_type, quantity, must_return, equipment(id, code, name), consumables(id, name, unit)";
const HISTORY = "id, from_status, to_status, note, changed_at, profiles(name)";

export const labKeys = { all: ["labman"] as const };

export const labsQuery = queryOptions({
  queryKey: ["labman", "labs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("laboratories").select(LAB).order("name");
    if (error) throw error;
    return data;
  },
});

export const labQuery = (id: string) =>
  queryOptions({
    queryKey: ["labman", "lab", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("laboratories").select(LAB).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const scheduleQuery = (labIds: string[] | string, from: string, to: string) =>
  queryOptions({
    queryKey: ["labman", "schedule", labIds, from, to],
    queryFn: async () => {
      const ids = Array.isArray(labIds) ? labIds : [labIds];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("laboratory_schedule_entries")
        .select("id, laboratory_id, lab_usage_request_id, date, start_time, end_time, activity, is_locked, laboratories(name)")
        .in("laboratory_id", ids)
        .gte("date", from)
        .lte("date", to)
        .order("date")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

export type ScheduleEntry = Awaited<ReturnType<NonNullable<ReturnType<typeof scheduleQuery>["queryFn"]>>>[number];

const REQUEST_LIST =
  "id, laboratory_id, usage_date, start_time, end_time, purpose, status, rejection_reason, approved_at, created_at, laboratories(id, name), requester:profiles!lab_usage_requests_requester_id_fkey(id, name, nim_nip, roles(name))";

/** RLS returns the caller's own requests, or every request of a KaLab's labs. */
export const labRequestsQuery = queryOptions({
  queryKey: ["labman", "lab-requests"],
  queryFn: async () => {
    const { data, error } = await supabase.from("lab_usage_requests").select(REQUEST_LIST).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const labRequestQuery = (id: string) =>
  queryOptions({
    queryKey: ["labman", "lab-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_usage_requests")
        .select(`${REQUEST_LIST}, approver:profiles!lab_usage_requests_approved_by_fkey(name), labKalab:laboratories(kalab:profiles!laboratories_kalab_id_fkey(name)), status_history(${HISTORY})`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const catalogQuery = queryOptions({
  queryKey: ["labman", "catalog"],
  queryFn: async () => {
    const [eq, co] = await Promise.all([
      supabase
        .from("equipment")
        .select("*, equipment_categories(id, name), laboratories(id, name), calibrations(id, last_calibrated, next_calibration, status, certificate_url)")
        .order("name"),
      supabase.from("consumables").select("*, laboratories(id, name)").order("name"),
    ]);
    if (eq.error) throw eq.error;
    if (co.error) throw co.error;
    return { equipment: eq.data, consumables: co.data };
  },
});

export type CatalogEquipment = Awaited<ReturnType<NonNullable<typeof catalogQuery.queryFn>>>["equipment"][number];
export type CatalogConsumable = Awaited<ReturnType<NonNullable<typeof catalogQuery.queryFn>>>["consumables"][number];

export const categoriesQuery = queryOptions({
  queryKey: ["labman", "categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("equipment_categories").select("id, name, equipment(count)").order("name");
    if (error) throw error;
    return data;
  },
});

const BORROWING_LIST = `id, laboratory_id, purpose, borrow_date, return_due_date, status, is_overdue, rejection_reason, created_at, approved_at,
  laboratories(id, name), borrower:profiles!equipment_borrowings_borrower_id_fkey(id, name, nim_nip, roles(name)), borrowing_items(${ITEMS})`;

/** RLS returns the caller's own borrowings, or every borrowing of a KaLab's labs. */
export const borrowingsQuery = queryOptions({
  queryKey: ["labman", "borrowings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("equipment_borrowings").select(BORROWING_LIST).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export type BorrowingRow = Awaited<ReturnType<NonNullable<typeof borrowingsQuery.queryFn>>>[number];

export const borrowingQuery = (id: string) =>
  queryOptions({
    queryKey: ["labman", "borrowing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_borrowings")
        .select(
          `${BORROWING_LIST}, approver:profiles!equipment_borrowings_approved_by_fkey(name),
          borrowing_readiness(id, photo_url, note, uploaded_at, profiles(name)),
          borrowing_return_evidence(id, photo_url, note, uploaded_at, profiles(name)),
          borrowing_verifications(id, result, discrepancy_note, follow_up, verified_at, profiles(name)),
          status_history(${HISTORY})`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const stockMovementsQuery = (consumableId: string) =>
  queryOptions({
    queryKey: ["labman", "stock", consumableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, type, quantity, created_at, borrowing_item_id, profiles(name)")
        .eq("consumable_id", consumableId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

/** Status changes on the caller's transactions made by someone else. */
export const notificationsQuery = (meId: string) =>
  queryOptions({
    queryKey: ["labman", "notifications", meId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_history")
        .select(
          "id, from_status, to_status, note, changed_at, changed_by, profiles(name), lab_usage_requests(id, purpose, usage_date, laboratories(name)), equipment_borrowings(id, purpose, borrow_date, laboratories(name))",
        )
        .or(`changed_by.is.null,changed_by.neq.${meId}`)
        .order("changed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

/** Labs headed by the signed-in KaLab. */
export function useMyLabs(meId: string | undefined) {
  return useQuery({ ...labsQuery, select: (labs) => labs.filter((l) => l.kalab_id === meId) });
}
