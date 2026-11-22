"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { CreateModuleDialog } from "@/components/vlab/create-module-dialog";
import { ModulesTable } from "@/components/vlab/modules-table";
import { Button } from "@/components/ui/button";
import { meQueryOptions } from "@/lib/profile";
import { dosenModulesQuery, lecturerCoursesQuery } from "@/lib/vlab-queries";


export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: assignments, isLoading } = useQuery(lecturerCoursesQuery(me!.id));
  const { data: modules } = useQuery(dosenModulesQuery);
  const mine = assignments?.filter((a) => a.courses?.id === courseId) ?? [];
  const course = mine[0]?.courses;

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!course)
    return (
      <div>
        <PageHeader title="Mata kuliah tidak ditemukan" description="Anda tidak ditugaskan ke mata kuliah ini." />
        <Button asChild variant="outline">
          <Link to="/mata-kuliah">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
      </div>
    );

  const rows = (modules ?? []).filter((m) => m.course_id === courseId);
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/mata-kuliah">
          <ArrowLeft /> Mata Kuliah Diampu
        </Link>
      </Button>
      <PageHeader
        title={`${course.code} · ${course.name}`}
        description={`${course.program_studies?.name ?? ""} · Semester ${course.semester ?? "-"}`}
        actions={<CreateModuleDialog courseId={courseId} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {mine.map((a) => (
          <StatusBadge key={a.id} label={`TA ${a.academic_year}`} tone="info" />
        ))}
      </div>
      <h2 className="mb-3 text-base font-semibold">Modul praktikum</h2>
      <ModulesTable rows={rows} showCourse={false} />
    </div>
  );
}
