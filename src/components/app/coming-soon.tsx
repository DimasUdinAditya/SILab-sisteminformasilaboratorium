"use client";

import { Hourglass } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";

export function ComingSoon({ title, description }: { title: string; description?: string | undefined }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-20 text-center shadow-card">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Hourglass className="size-6" />
        </div>
        <StatusBadge label="Segera hadir" tone="info" />
        <h2 className="mt-3 text-lg font-semibold">Fitur ini sedang disiapkan</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Halaman {title} akan tersedia pada tahap pengembangan berikutnya.
        </p>
      </div>
    </div>
  );
}
