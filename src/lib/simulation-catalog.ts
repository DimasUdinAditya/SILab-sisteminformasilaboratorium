import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CatalogSimulation = Tables<"simulation_catalog">;

/** Super Admin melihat semua baris; dosen hanya baris aktif (dibatasi RLS). */
export const simulationCatalogQuery = queryOptions({
  queryKey: ["vlab", "sim-catalog"],
  queryFn: async () => {
    const { data, error } = await supabase.from("simulation_catalog").select("*").order("title");
    if (error) throw error;
    return data as CatalogSimulation[];
  },
});
