import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { ModuleEditorData } from "@/lib/vlab-queries";

export type EditorModule = ModuleEditorData;

/** Refetch the editor + lists, and bump the module's "last updated" time. */
export function useEditorRefresh(moduleId: string) {
  const qc = useQueryClient();
  return async (touch = true) => {
    if (touch) await supabase.from("modules").update({ updated_at: new Date().toISOString() }).eq("id", moduleId);
    await qc.invalidateQueries({ queryKey: ["vlab"] });
  };
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function StepNotUsed({ used, label }: { used: boolean; label: string }) {
  if (used) return null;
  return (
    <p className="mb-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
      Tahap {label} sedang tidak dipakai pada urutan belajar. Aktifkan lagi di tab Informasi bila diperlukan.
    </p>
  );
}
