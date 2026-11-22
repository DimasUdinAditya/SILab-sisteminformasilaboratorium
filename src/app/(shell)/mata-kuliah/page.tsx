"use client";

import { Link } from "@/lib/router-compat";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { meQueryOptions } from "@/lib/profile";
import { dosenModulesQuery, lecturerCoursesQuery } from "@/lib/vlab-queries";


export default function CoursesPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: assignments, isLoading } = useQuery(lecturerCoursesQuery(me!.id));
  const { data: modules } = useQuery(dosenModulesQuery);

  return (
    <div>
      <PageHeader title="Mata Kuliah Diampu" description="Mata kuliah yang ditugaskan kepada Anda beserta modul praktikumnya." />
      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {assignments?.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          Anda belum ditugaskan ke mata kuliah. Hubungi Super Admin.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assignments?.map((a) => {
          const c = a.courses;
          if (!c) return null;
          const mods = (modules ?? []).filter((m) => m.course_id === c.id);
          const published = mods.filter((m) => m.status === "Published").length;
          return (
            <Link
              key={a.id}
              to="/mata-kuliah/$courseId"
              params={{ courseId: c.id }}
              className="group rounded-xl border bg-card p-5 shadow-card transition hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{c.code}</p>
                  <h2 className="mt-1 text-base font-semibold">{c.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.program_studies?.name} · Semester {c.semester ?? "-"}
                  </p>
                </div>
                <StatusBadge label={`TA ${a.academic_year}`} tone="info" />
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="size-4" /> {mods.length} modul · {published} Published
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
