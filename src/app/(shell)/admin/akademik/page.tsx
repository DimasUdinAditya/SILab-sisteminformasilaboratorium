"use client";

import {  } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { MasterTable } from "@/components/admin/master-table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  assignmentsQuery,
  coursesQuery,
  facultiesQuery,
  lecturersQuery,
  prodisQuery,
} from "@/lib/admin-queries";


function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["master"] });
}

export default function AkademikPage() {
  return (
    <div>
      <PageHeader title="Master Data Akademik" description="Kelola fakultas, program studi, mata kuliah, dan penugasan dosen." />
      <Tabs defaultValue="prodi">
        <TabsList className="mb-4">
          <TabsTrigger value="fakultas">Fakultas</TabsTrigger>
          <TabsTrigger value="prodi">Program Studi</TabsTrigger>
          <TabsTrigger value="mk">Mata Kuliah</TabsTrigger>
          <TabsTrigger value="penugasan">Penugasan Dosen</TabsTrigger>
        </TabsList>
        <TabsContent value="fakultas">
          <FacultiesTab />
        </TabsContent>
        <TabsContent value="prodi">
          <ProdiTab />
        </TabsContent>
        <TabsContent value="mk">
          <CoursesTab />
        </TabsContent>
        <TabsContent value="penugasan">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FacultiesTab() {
  const { data } = useQuery(facultiesQuery);
  const refresh = useRefresh();
  return (
    <MasterTable
      entity="Fakultas"
      rows={data}
      columns={[
        { header: "Kode", cell: (r) => <span className="font-medium">{r.code}</span> },
        { header: "Nama", cell: (r) => r.name },
      ]}
      fields={[
        { key: "code", label: "Kode", required: true, placeholder: "FIKES" },
        { key: "name", label: "Nama", required: true },
      ]}
      toForm={(r) => ({ code: r.code, name: r.name })}
      onSave={async (v, id) => {
        const row = { code: v.code.trim().toUpperCase(), name: v.name.trim() };
        const { error } = id
          ? await supabase.from("faculties").update(row).eq("id", id)
          : await supabase.from("faculties").insert(row);
        if (!error) await refresh();
        return error;
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("faculties").delete().eq("id", id);
        if (!error) await refresh();
        return error;
      }}
    />
  );
}

function ProdiTab() {
  const { data } = useQuery(prodisQuery);
  const { data: faculties } = useQuery(facultiesQuery);
  const refresh = useRefresh();
  return (
    <MasterTable
      entity="Program Studi"
      rows={data}
      columns={[
        { header: "Kode", cell: (r) => <span className="font-medium">{r.code}</span> },
        { header: "Nama", cell: (r) => r.name },
        { header: "Fakultas", cell: (r) => r.faculties?.code ?? "-" },
      ]}
      fields={[
        { key: "code", label: "Kode", required: true, placeholder: "KEP" },
        { key: "name", label: "Nama", required: true, placeholder: "S1 Keperawatan" },
        {
          key: "faculty_id",
          label: "Fakultas",
          type: "select",
          required: true,
          options: (faculties ?? []).map((f) => ({ value: f.id, label: `${f.code} · ${f.name}` })),
        },
      ]}
      toForm={(r) => ({ code: r.code, name: r.name, faculty_id: r.faculty_id })}
      onSave={async (v, id) => {
        const row = { code: v.code.trim().toUpperCase(), name: v.name.trim(), faculty_id: v.faculty_id };
        const { error } = id
          ? await supabase.from("program_studies").update(row).eq("id", id)
          : await supabase.from("program_studies").insert(row);
        if (!error) await refresh();
        return error;
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("program_studies").delete().eq("id", id);
        if (!error) await refresh();
        return error;
      }}
    />
  );
}

function CoursesTab() {
  const { data } = useQuery(coursesQuery);
  const { data: prodis } = useQuery(prodisQuery);
  const refresh = useRefresh();
  return (
    <MasterTable
      entity="Mata Kuliah"
      rows={data}
      columns={[
        { header: "Kode", cell: (r) => <span className="font-medium">{r.code}</span> },
        { header: "Nama", cell: (r) => r.name },
        { header: "Prodi", cell: (r) => r.program_studies?.code ?? "-" },
        { header: "Semester", cell: (r) => r.semester ?? "-" },
      ]}
      fields={[
        { key: "code", label: "Kode", required: true, placeholder: "KEP101" },
        { key: "name", label: "Nama", required: true },
        {
          key: "program_study_id",
          label: "Program studi",
          type: "select",
          required: true,
          options: (prodis ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
        },
        { key: "semester", label: "Semester", type: "number" },
      ]}
      toForm={(r) => ({
        code: r.code,
        name: r.name,
        program_study_id: r.program_study_id,
        semester: r.semester?.toString() ?? "",
      })}
      onSave={async (v, id) => {
        const semester = v.semester ? Number.parseInt(v.semester, 10) : null;
        if (semester !== null && (Number.isNaN(semester) || semester < 1 || semester > 14))
          return { message: "Semester harus angka 1–14." };
        const row = {
          code: v.code.trim().toUpperCase(),
          name: v.name.trim(),
          program_study_id: v.program_study_id,
          semester,
        };
        const { error } = id
          ? await supabase.from("courses").update(row).eq("id", id)
          : await supabase.from("courses").insert(row);
        if (!error) await refresh();
        return error;
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (!error) await refresh();
        return error;
      }}
    />
  );
}

function AssignmentsTab() {
  const { data } = useQuery(assignmentsQuery);
  const { data: courses } = useQuery(coursesQuery);
  const { data: lecturers } = useQuery(lecturersQuery);
  const refresh = useRefresh();
  return (
    <MasterTable
      entity="Penugasan"
      rows={data}
      columns={[
        { header: "Mata kuliah", cell: (r) => (r.courses ? `${r.courses.code} · ${r.courses.name}` : "-") },
        { header: "Dosen", cell: (r) => r.profiles?.name ?? "-" },
        { header: "Tahun akademik", cell: (r) => <StatusBadge label={r.academic_year} tone="info" /> },
      ]}
      fields={[
        {
          key: "course_id",
          label: "Mata kuliah",
          type: "select",
          required: true,
          options: (courses ?? []).map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` })),
        },
        {
          key: "lecturer_id",
          label: "Dosen",
          type: "select",
          required: true,
          options: (lecturers ?? [])
            .filter((l) => l.is_active)
            .map((l) => ({ value: l.id, label: l.nim_nip ? `${l.name} (${l.nim_nip})` : l.name })),
        },
        { key: "academic_year", label: "Tahun akademik", required: true, placeholder: "2026/2027" },
      ]}
      toForm={(r) => ({ course_id: r.course_id, lecturer_id: r.lecturer_id, academic_year: r.academic_year })}
      onSave={async (v, id) => {
        if (!/^\d{4}\/\d{4}$/.test(v.academic_year.trim()))
          return { message: "Format tahun akademik: 2026/2027" };
        const row = { course_id: v.course_id, lecturer_id: v.lecturer_id, academic_year: v.academic_year.trim() };
        const { error } = id
          ? await supabase.from("lecturer_assignments").update(row).eq("id", id)
          : await supabase.from("lecturer_assignments").insert(row);
        if (!error) await refresh();
        return error;
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("lecturer_assignments").delete().eq("id", id);
        if (!error) await refresh();
        return error;
      }}
    />
  );
}
