import DOMPurify from "dompurify";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

/** Renders lecturer-authored HTML after sanitising it. */
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true } }), [html]);
  if (!clean.trim()) return null;
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}

export function isEmptyHtml(html: string | null | undefined): boolean {
  return !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}
