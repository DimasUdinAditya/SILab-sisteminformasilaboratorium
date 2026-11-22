import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const myNotificationsQuery = (limit = 100) =>
  queryOptions({
    queryKey: ["notifications", "list", limit],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, link_url, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

export const unreadCountQuery = queryOptions({
  queryKey: ["notifications", "unread"],
  refetchInterval: 60_000,
  queryFn: async () => {
    const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
    if (error) throw error;
    return count ?? 0;
  },
});

export async function markRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from("notifications").update({ is_read: true }).in("id", ids);
}

/** Notification links point at app pages; the endorsement queue has no per-item page. */
export function notificationHref(url: string | null): string | null {
  if (!url || !url.startsWith("/")) return null;
  if (url.startsWith("/pengesahan")) return "/pengesahan";
  return url;
}
