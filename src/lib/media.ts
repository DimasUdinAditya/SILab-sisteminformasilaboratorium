import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { uuidv7, type MediaType } from "@/lib/vlab";

export const MEDIA_BUCKET = "module-media";
export const MAX_MEDIA_MB = 50;
export type MediaAsset = Tables<"media_assets">;

export function mediaTypeOf(mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

/** Uploads into the lecturer's own folder of the private bucket and records the media asset. */
export async function uploadMedia(file: File, userId: string): Promise<MediaAsset> {
  if (file.size > MAX_MEDIA_MB * 1024 * 1024) throw new Error(`Ukuran file maksimal ${MAX_MEDIA_MB} MB.`);
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${userId}/${uuidv7()}-${safe}`;
  const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      uploaded_by: userId,
      type: mediaTypeOf(file.type),
      file_url: path,
      mime_type: file.type || null,
      size_kb: Math.ceil(file.size / 1024),
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw error;
  }
  return data;
}

/** Short-lived link to a private file. */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
