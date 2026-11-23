"use client";

import { Link } from "@/lib/router-compat";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  BookOpenCheck,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  Library,
  Microscope,
  Package,
  PackageOpen,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Clock,
  FileSignature,
} from "lucide-react";

import { KalabCards } from "@/components/monitoring/kalab-overview";
import { LeadershipCards } from "@/components/monitoring/leadership-view";
import { thisMonth } from "@/lib/summary";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { meQueryOptions, type Me } from "@/lib/profile";
import { APP_ROLES, ROLE_LABELS } from "@/lib/roles";
import { formatDate, STEP_LABELS, summarizeStudentModules } from "@/lib/vlab";
import { studentModulesQuery } from "@/lib/vlab-queries";


export default function DashboardPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  if (!me) return null;
  const first = me.name.split(" ").find((p) => !p.endsWith(".")) ?? me.name;
  switch (me.role) {
    case "super_admin":
      return <AdminDashboard first={first} />;
    case "dosen":
      return <DosenDashboard me={me} first={first} />;
    case "mahasiswa":
      return <MahasiswaDashboard first={first} />;
    case "kalab":
      return <KalabDashboard first={first} />;
    case "dekan":
      return <DekanDashboard first={first} />;
    default:
      return <PimpinanDashboard me={me} />;
  }
}

function Soon({ label, icon }: { label: string; icon: typeof Users }) {
  return <StatCard label={label} value="—" icon={icon} hint="Segera hadir" />;
}

function AdminDashboard({ first }: { first: string }) {
  const { data } = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: async () => {
      const [p, ps, c, rg] = await Promise.all([
        supabase.from("profiles").select("is_active, roles(code)"),
        supabase.from("program_studies").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("user_registrations").select("status"),
      ]);
      const regs = rg.data ?? [];
      const reg = {
        Menunggu: regs.filter((r) => r.status === "Menunggu").length,
        Disetujui: regs.filter((r) => r.status === "Disetujui").length,
        Ditolak: regs.filter((r) => r.status === "Ditolak").length,
      };
      const profiles = p.data ?? [];
      const perRole = Object.fromEntries(APP_ROLES.map((r) => [r, 0])) as Record<string, number>;
      profiles.forEach((x) => {
        if (x.roles) perRole[x.roles.code] = (perRole[x.roles.code] ?? 0) + 1;
      });
      return {
        total: profiles.length,
        active: profiles.filter((x) => x.is_active).length,
        prodi: ps.count ?? 0,
        courses: c.count ?? 0,
        perRole,
        reg,
      };
    },
  });
  return (
    <div>
      <PageHeader title={`Halo, ${first}`} description="Ringkasan pengguna dan master data SiLab." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pengguna" value={data?.total ?? "…"} icon={Users} />
        <StatCard label="Pengguna aktif" value={data?.active ?? "…"} icon={UserCheck} />
        <StatCard label="Program studi" value={data?.prodi ?? "…"} icon={Library} />
        <StatCard label="Mata kuliah" value={data?.courses ?? "…"} icon={GraduationCap} />
      </div>
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Registrasi mandiri</h2>
            <p className="text-sm text-muted-foreground">Akun yang mendaftar sendiri lewat halaman Daftar.</p>
          </div>
          <Button asChild>
            <Link to="/admin/registrasi">
              <UserPlus /> Persetujuan Registrasi
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Menunggu" value={data?.reg.Menunggu ?? "…"} icon={Clock} />
          <StatCard label="Disetujui" value={data?.reg.Disetujui ?? "…"} icon={UserCheck} />
          <StatCard label="Ditolak" value={data?.reg.Ditolak ?? "…"} icon={UserX} />
        </div>
      </div>
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pengguna per role</h2>
          <Link to="/admin/pengguna" className="text-sm font-medium text-secondary hover:underline">
            Kelola pengguna
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {APP_ROLES.map((r) => (
            <div key={r} className="rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[r]}</p>
              <p className="mt-1 font-display text-2xl font-bold">{data?.perRole[r] ?? "…"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DosenDashboard({ me, first }: { me: Me; first: string }) {
  const { data } = useQuery({
    queryKey: ["dashboard", "dosen", me.id],
    queryFn: async () => {
      const [a, m, w] = await Promise.all([
        supabase
          .from("lecturer_assignments")
          .select("id, academic_year, courses(code, name, semester)")
          .eq("lecturer_id", me.id),
        supabase
          .from("modules")
          .select("id, title, status, updated_at, courses(code)")
          .order("updated_at", { ascending: false }),
        supabase.from("assessment_attempts").select("id", { count: "exact", head: true }).eq("status", "waiting_review"),
      ]);
      const mods = m.data ?? [];
      return {
        assignments: a.data ?? [],
        published: mods.filter((x) => x.status === "Published").length,
        draft: mods.filter((x) => x.status === "Draft").length,
        recent: mods.slice(0, 5),
        waiting: w.count ?? 0,
      };
    },
  });
  return (
    <div>
      <PageHeader title={`Halo, ${first}`} description="Ringkasan mata kuliah dan modul praktikum Anda." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mata kuliah diampu" value={data?.assignments.length ?? "…"} icon={GraduationCap} />
        <StatCard label="Modul Published" value={data?.published ?? "…"} icon={BookOpenCheck} />
        <StatCard label="Modul Draft" value={data?.draft ?? "…"} icon={BookOpen} />
        <StatCard label="Esai menunggu koreksi" value={data?.waiting ?? "…"} icon={ClipboardList} />
      </div>
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Modul terakhir dikelola</h2>
          <Link to="/kelola-modul" className="text-sm font-medium text-secondary hover:underline">
            Kelola modul
          </Link>
        </div>
        {data && data.recent.length === 0 && <p className="text-sm text-muted-foreground">Belum ada modul.</p>}
        <ul className="divide-y">
          {data?.recent.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{x.title}</p>
                <p className="text-xs text-muted-foreground">
                  {x.courses?.code ?? "-"} · Diperbarui {formatDate(x.updated_at, true)}
                </p>
              </div>
              <StatusBadge label={x.status === "Published" ? "Published" : "Draft"} tone={x.status === "Published" ? "success" : "neutral"} />
            </li>
          ))}
        </ul>
      </div>
      {!!data?.waiting && (
        <Link
          to="/assessment"
          className="mt-4 block rounded-lg bg-warning-soft px-4 py-3 text-sm font-medium text-warning hover:underline"
        >
          {data.waiting} jawaban esai menunggu koreksi Anda. Buka Assessment →
        </Link>
      )}
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold">Mata kuliah yang ditugaskan</h2>
        {data && data.assignments.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada penugasan mata kuliah.</p>
        )}
        <ul className="divide-y">
          {data?.assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">
                  {a.courses?.code} · {a.courses?.name}
                </p>
                <p className="text-xs text-muted-foreground">Semester {a.courses?.semester ?? "-"}</p>
              </div>
              <StatusBadge label={`TA ${a.academic_year}`} tone="info" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MahasiswaDashboard({ first }: { first: string }) {
  const { data: modules } = useQuery(studentModulesQuery);
  // Hanya data milik mahasiswa ini: RLS membatasi baris ke pengajuan dan peminjaman miliknya sendiri.
  const { data: counts } = useQuery({
    queryKey: ["mahasiswa", "counts"],
    queryFn: async () => {
      const [labs, borrow] = await Promise.all([
        supabase.from("lab_usage_requests").select("id", { count: "exact", head: true }),
        supabase.from("equipment_borrowings").select("id", { count: "exact", head: true }).not("status", "in", "(Dikonfirmasi,Ditolak)"),
      ]);
      if (labs.error) throw labs.error;
      if (borrow.error) throw borrow.error;
      return { labs: labs.count ?? 0, borrow: borrow.count ?? 0 };
    },
  });
  const rows = summarizeStudentModules(modules ?? []);
  const avg = rows.length ? Math.round(rows.reduce((t, r) => t + r.pct, 0) / rows.length) : null;
  const active = rows.filter((r) => r.status.label !== "Selesai").slice(0, 4);
  return (
    <div>
      <PageHeader title={`Halo, ${first}`} description="Lanjutkan praktikum virtual dan pantau peminjaman Anda." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Modul tersedia" value={modules ? rows.length : "…"} icon={BookOpen} />
        <StatCard label="Progres rata-rata" value={avg == null ? "—" : `${avg}%`} icon={BookOpenCheck} hint={modules ? `${rows.filter((r) => r.status.label === "Selesai").length} modul selesai` : undefined} />
        <StatCard label="Pengajuan lab" value={counts ? counts.labs : "…"} icon={FlaskConical} />
        <StatCard label="Peminjaman aktif" value={counts ? counts.borrow : "…"} icon={PackageOpen} />
      </div>
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Lanjutkan belajar</h2>
          <Link to="/modul-praktikum" className="text-sm font-medium text-secondary hover:underline">
            Semua modul
          </Link>
        </div>
        {modules && active.length === 0 && (
          <p className="text-sm text-muted-foreground">{rows.length ? "Semua modul sudah selesai. Kerja bagus!" : "Belum ada modul untuk Anda."}</p>
        )}
        <ul className="divide-y">
          {active.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.courses?.code} · {r.p ? `Berikutnya: ${STEP_LABELS[r.step]}` : "Belum mulai"}
                </p>
              </div>
              <div className="flex w-40 items-center gap-2">
                <Progress value={r.pct} className="h-2" aria-label={`Progres ${r.title}`} />
                <span className="w-9 text-right text-xs tabular-nums">{Math.round(r.pct)}%</span>
              </div>
              <Button asChild size="sm">
                <Link to="/modul-praktikum/$id/belajar" params={{ id: r.id }} search={{ step: r.step }}>
                  {r.p ? "Lanjutkan" : "Mulai"}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KalabDashboard({ first }: { first: string }) {
  return (
    <div>
      <PageHeader title={`Halo, ${first}`} description="Ringkasan laboratorium yang Anda kelola bulan ini." />
      <KalabCards period={thisMonth()} />
    </div>
  );
}

function DekanDashboard({ first }: { first: string }) {
  return (
    <div>
      <PageHeader
        title={`Halo, ${first}`}
        description="Ringkasan agregat Fakultas Ilmu Kesehatan bulan ini. Tanpa nama mahasiswa dan nilai individual."
        actions={
          <Button asChild>
            <Link to="/pengesahan">Buka antrean pengesahan</Link>
          </Button>
        }
      />
      <LeadershipCards period={thisMonth()} compact />
    </div>
  );
}

function PimpinanDashboard({ me }: { me: Me }) {
  const scope = me.role === "kaprodi" ? (me.prodi?.name ?? "Program studi") : "Fakultas Ilmu Kesehatan";
  return (
    <div>
      <PageHeader
        title="Dashboard Monitoring"
        description={`Data agregat bulan ini untuk ${scope}. Tanpa nama mahasiswa dan nilai individual.`}
        actions={
          <Button asChild variant="outline">
            <Link to="/monitoring-laboratorium">Lihat rincian</Link>
          </Button>
        }
      />
      <LeadershipCards period={thisMonth()} />
    </div>
  );
}
