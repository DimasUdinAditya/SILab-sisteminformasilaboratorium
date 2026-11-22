import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { validateLabFile } from "@/lib/labman";
import { uuidv7 } from "@/lib/vlab";

export type LabBucket = "readiness-photos" | "return-photos" | "calibration-certificates" | "equipment-photos";

/** Uploads into `<folderId>/…` of a private bucket and returns the stored path. */
export async function uploadLabFile(bucket: LabBucket, folderId: string, file: File): Promise<string> {
  const invalid = validateLabFile(file, bucket === "calibration-certificates" ? "document" : "photo");
  if (invalid) throw new Error(invalid);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folderId}/${uuidv7()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export function useLabFileUrl(bucket: LabBucket, path: string | null | undefined) {
  return useQuery({
    queryKey: ["lab-file", bucket, path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
