"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Placeholder: official letters arrive in Tahap 4. */
export function LetterPreviewButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button variant="outline" disabled>
            <FileText /> Preview Surat
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Surat resmi segera tersedia</TooltipContent>
    </Tooltip>
  );
}
