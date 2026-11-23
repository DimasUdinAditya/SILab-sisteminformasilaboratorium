import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CatalogThumb = { id: string; file_url: string; type: string; mime_type: string | null };
export type CatalogSimulation = Tables<"simulation_catalog"> & { thumbnail: CatalogThumb | null };

/**
 * Super Admin melihat semua baris; dosen dan mahasiswa hanya baris aktif (dibatasi RLS).
 * Thumbnail diambil lewat relasi thumbnail_asset_id.
 */
export const simulationCatalogQuery = queryOptions({
  queryKey: ["vlab", "sim-catalog"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("simulation_catalog")
      .select("*, thumbnail:media_assets!simulation_catalog_thumbnail_asset_id_fkey(id, file_url, type, mime_type)")
      .order("title");
    if (error) throw error;
    return (data ?? []) as unknown as CatalogSimulation[];
  },
});
