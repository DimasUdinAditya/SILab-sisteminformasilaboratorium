"use client";

import {  } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { CreateModuleDialog } from "@/components/vlab/create-module-dialog";
import { ModulesTable } from "@/components/vlab/modules-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dosenModulesQuery } from "@/lib/vlab-queries";


export default function ManageModulesPage() {
  const { data: modules, isLoading } = useQuery(dosenModulesQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [course, setCourse] = useState("all");
  const courses = useMemo(
    () => Array.from(new Map((modules ?? []).map((m) => [m.course_id, m.courses] as const)).entries()),
    [modules],
  );
  const rows = (modules ?? []).filter(
    (m) =>
      (status === "all" || m.status === status) &&
      (course === "all" || m.course_id === course) &&
      m.title.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Kelola Modul"
        description="Susun materi, prosedur, simulasi, dan assessment, lalu publikasikan ke mahasiswa."
        actions={<CreateModuleDialog />}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul modul" className="pl-9" aria-label="Cari judul modul" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
          </SelectContent>
        </Select>
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="w-64" aria-label="Filter mata kuliah">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua mata kuliah</SelectItem>
            {courses.map(([id, c]) => (
              <SelectItem key={id} value={id}>
                {c?.code} · {c?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : <ModulesTable rows={rows} />}
    </div>
  );
}
