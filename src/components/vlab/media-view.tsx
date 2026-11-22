import { ExternalLink, FileText, Loader2 } from "lucide-react";

import { useSignedUrl } from "@/lib/media";
import { isDirectVideo, isSafeHttpUrl, toEmbedUrl } from "@/lib/vlab";

type Asset = { file_url: string; type: string; mime_type: string | null } | null | undefined;

export function MediaView({ asset, alt, className }: { asset: Asset; alt: string; className?: string }) {
  const { data: url, isLoading, isError } = useSignedUrl(asset?.file_url);
  if (!asset) return null;
  if (isLoading)
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Memuat media…
      </div>
    );
  if (isError || !url) return <p className="text-sm text-destructive">Media tidak dapat dimuat.</p>;
  if (asset.type === "image")
    return <img src={url} alt={alt} className={className ?? "max-h-[480px] w-full rounded-lg border bg-muted object-contain"} />;
  if (asset.type === "video")
    return <video src={url} controls className={className ?? "w-full rounded-lg border bg-muted"} />;
  if (asset.type === "pdf")
    return (
      <div className="space-y-2">
        <iframe src={url} title={alt} className="h-[560px] w-full rounded-lg border bg-muted" />
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline">
          <FileText className="size-4" /> Buka PDF di tab baru
        </a>
      </div>
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline">
      <ExternalLink className="size-4" /> Unduh file
    </a>
  );
}

/** YouTube/Vimeo/direct video or any https page (e.g. PhET) in a responsive frame. */
export function EmbedView({ url, title }: { url: string; title: string }) {
  const src = toEmbedUrl(url);
  if (!isSafeHttpUrl(src)) return <p className="text-sm text-destructive">Tautan tidak valid.</p>;
  if (isDirectVideo(src)) return <video src={src} controls className="w-full rounded-lg border bg-muted" />;
  return (
    <div className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        />
      </div>
      <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline">
        <ExternalLink className="size-3.5" /> Buka di tab baru
      </a>
    </div>
  );
}
