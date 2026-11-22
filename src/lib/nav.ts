import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  BookOpenCheck,
  Building2,
  FileSignature,
  Landmark,
  UserPlus,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  GaugeCircle,
  GraduationCap,
  LayoutDashboard,
  Library,
  type LucideIcon,
  Microscope,
  Package,
  PackageOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCircle,
  Users,
} from "lucide-react";

import type { AppRole } from "@/lib/roles";

export type NavItem = { title: string; to: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

const I = {
  dashboard: { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  dashboardMonitoring: { title: "Dashboard Monitoring", to: "/dashboard", icon: GaugeCircle },
  modulPraktikum: { title: "Modul Praktikum", to: "/modul-praktikum", icon: BookOpen },
  progresBelajar: { title: "Progres Belajar", to: "/progres-belajar", icon: TrendingUp },
  laboratorium: { title: "Laboratorium", to: "/laboratorium", icon: FlaskConical },
  peminjaman: { title: "Peminjaman Alat & Bahan", to: "/peminjaman", icon: PackageOpen },
  notifikasi: { title: "Notifikasi", to: "/notifikasi", icon: Bell },
  profil: { title: "Profil Akun", to: "/profil", icon: UserCircle },
  mataKuliah: { title: "Mata Kuliah Diampu", to: "/mata-kuliah", icon: GraduationCap },
  kelolaModul: { title: "Kelola Modul", to: "/kelola-modul", icon: BookOpenCheck },
  assessment: { title: "Assessment", to: "/assessment", icon: ClipboardCheck },
  monitoringPembelajaran: {
    title: "Monitoring Pembelajaran",
    to: "/monitoring-pembelajaran",
    icon: Activity,
  },
  pengajuanLab: { title: "Pengajuan Penggunaan Lab", to: "/pengajuan-lab", icon: ClipboardList },
  inventaris: { title: "Inventaris", to: "/inventaris", icon: Package },
  kalibrasi: { title: "Kalibrasi", to: "/kalibrasi", icon: Microscope },
  laporan: { title: "Laporan", to: "/laporan", icon: FileText },
  monitoringLab: { title: "Monitoring Laboratorium", to: "/monitoring-laboratorium", icon: BarChart3 },
  pengguna: { title: "Manajemen Pengguna", to: "/admin/pengguna", icon: Users },
  registrasi: { title: "Persetujuan Registrasi", to: "/admin/registrasi", icon: UserPlus },
  monitoringFakultas: { title: "Monitoring Fakultas", to: "/monitoring-fakultas", icon: Landmark },
  pengesahan: { title: "Pengesahan Peminjaman", to: "/pengesahan", icon: FileSignature },
  role: { title: "Manajemen Role", to: "/admin/role", icon: ShieldCheck },
  akademik: { title: "Master Data Akademik", to: "/admin/akademik", icon: Library },
  masterLab: { title: "Master Data Laboratorium", to: "/admin/laboratorium", icon: Building2 },
  konfigurasi: { title: "Konfigurasi Sistem", to: "/admin/konfigurasi", icon: Settings },
  auditLog: { title: "Audit Log", to: "/admin/audit-log", icon: ScrollText },
} satisfies Record<string, NavItem>;

const akun = (withNotif = true): NavGroup => ({
  label: "Akun",
  items: withNotif ? [I.notifikasi, I.profil] : [I.profil],
});

const pimpinan: NavGroup[] = [
  { label: "Utama", items: [I.dashboardMonitoring] },
  { label: "Monitoring", items: [I.monitoringLab, I.laporan] },
  akun(),
];

export const NAV: Record<AppRole, NavGroup[]> = {
  mahasiswa: [
    { label: "Utama", items: [I.dashboard] },
    { label: "Virtual Laboratory", items: [I.modulPraktikum, I.progresBelajar] },
    { label: "Laboratory Management", items: [I.laboratorium, I.peminjaman] },
    akun(),
  ],
  dosen: [
    { label: "Utama", items: [I.dashboard] },
    {
      label: "Virtual Laboratory",
      items: [I.mataKuliah, I.kelolaModul, I.assessment, I.monitoringPembelajaran],
    },
    { label: "Laboratory Management", items: [I.laboratorium, I.peminjaman] },
    akun(),
  ],
  kalab: [
    { label: "Utama", items: [I.dashboard] },
    {
      label: "Laboratory Management",
      items: [I.laboratorium, I.pengajuanLab, I.inventaris, I.peminjaman, I.kalibrasi, I.laporan],
    },
    akun(),
  ],
  kaprodi: pimpinan,
  wadek1: pimpinan,
  dekan: [
    { label: "Utama", items: [I.dashboard] },
    { label: "Fakultas", items: [I.monitoringFakultas, I.pengesahan, I.laporan] },
    akun(),
  ],
  super_admin: [
    { label: "Utama", items: [I.dashboard] },
    { label: "Administrasi", items: [I.pengguna, I.registrasi, I.role] },
    { label: "Master Data", items: [I.akademik, I.masterLab] },
    { label: "Sistem", items: [I.konfigurasi, I.auditLog] },
    akun(false),
  ],
};

function matches(itemPath: string, pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === itemPath || path.startsWith(itemPath + "/");
}

/** True when the role's sidebar contains the page (or a sub-page of it). */
export function canAccess(role: AppRole, pathname: string): boolean {
  return NAV[role].some((g) => g.items.some((i) => matches(i.to, pathname)));
}

/** Finds the sidebar group + item for a path, used for breadcrumbs and the active state. */
export function findNav(role: AppRole, pathname: string) {
  for (const group of NAV[role]) {
    for (const item of group.items) {
      if (matches(item.to, pathname)) {
        const path = pathname.replace(/\/+$/, "");
        return { group, item, isSubPage: path !== item.to };
      }
    }
  }
  return null;
}
