import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { MediaView } from "@/components/vlab/media-view";
import { Button } from "@/components/ui/button";
import { MAX_MEDIA_MB, uploadMedia, type MediaAsset } from "@/lib/media";
import { meQueryOptions } from "@/lib/profile";
import { errorMessage } from "@/lib/vlab";

type Asset = { id: string; file_url: string; type: MediaAsset["type"] | string; mime_type: string | null };

export function MediaUpload({
  value,
  onChange,
  accept,
  label = "Unggah file",
}: {
  value: Asset | null;
  onChange: (asset: Asset | null) => void;
  accept: string;
  label?: string;
}) {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file || !me) return;
    setBusy(true);
    try {
      onChange(await uploadMedia(file, me.id));
      toast.success("File berhasil diunggah.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {value && <MediaView asset={value} alt="Pratinjau media" />}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          {value ? "Ganti file" : label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> Hapus
          </Button>
        )}
        <span className="text-xs text-muted-foreground">Maksimal {MAX_MEDIA_MB} MB. File disimpan privat.</span>
      </div>
    </div>
  );
}
