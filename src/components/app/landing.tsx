import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardCheck, FlaskConical, GraduationCap, PackageOpen, ShieldCheck, Stethoscope, Users } from "lucide-react";

import heroLab from "@/assets/hero-lab.jpg";
import { Logo, TAGLINE } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

const MODULES = [
  {
    icon: BookOpen,
    title: "Virtual Laboratory",
    items: ["Modul praktikum per mata kuliah", "Materi, prosedur, dan simulasi video", "Pre-test, post-test, dan self-evaluation", "Progres belajar mahasiswa"],
  },
  {
    icon: FlaskConical,
    title: "Laboratory Management",
    items: ["Jadwal dan pengajuan penggunaan lab", "Katalog alat dan bahan", "Peminjaman dengan bukti foto kesiapan dan pengembalian", "Surat resmi bertanda tangan KaLab dan Dekan"],
  },
];

const FLOW = ["Ajukan", "Disetujui KaLab", "Surat resmi terbit", "Disahkan Dekan", "Dipinjam", "Dikembalikan", "Dikonfirmasi"];

const ROLES = [
  { icon: GraduationCap, name: "Mahasiswa", desc: "Mengikuti praktikum virtual, mengerjakan asesmen, dan mengajukan peminjaman." },
  { icon: Stethoscope, name: "Dosen", desc: "Menyusun dan mempublikasikan modul praktikum untuk mata kuliah yang diampu." },
  { icon: FlaskConical, name: "Kepala Laboratorium", desc: "Mengelola laboratorium, inventaris, jadwal, dan persetujuan peminjaman." },
  { icon: Users, name: "Kaprodi dan Wakil Dekan 1", desc: "Memantau aktivitas pembelajaran dan laboratorium secara agregat." },
  { icon: ClipboardCheck, name: "Dekan", desc: "Memantau data fakultas dan mengesahkan peminjaman yang sudah disetujui KaLab." },
  { icon: ShieldCheck, name: "Super Admin", desc: "Mengelola akun, persetujuan registrasi, dan data master akademik." },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="SiLab">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/auth">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="/daftar">Daftar</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Fakultas Ilmu Kesehatan · UPN Veteran Jakarta</p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">SiLab, sistem informasi laboratorium terpadu</h1>
          <p className="text-lg text-muted-foreground">{TAGLINE}. Praktikum virtual dan pengelolaan laboratorium dalam satu aplikasi.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth">Masuk ke SiLab</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/daftar">Daftar akun baru</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Akun baru perlu disetujui Super Admin sebelum bisa digunakan.</p>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-card">
          <Image src={heroLab} alt="Laboratorium FIKES" priority className="h-auto w-full object-cover" />
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold text-foreground">Dua modul dalam satu sistem</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {MODULES.map((m) => (
              <div key={m.title} className="rounded-xl border bg-background p-6 shadow-card">
                <m.icon className="size-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{m.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {m.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold text-foreground">Alur peminjaman alat dan bahan</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-card">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
              <span className="text-sm font-medium">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <PackageOpen className="size-4" /> Pengesahan Dekan bersifat administratif dan tidak menunda peminjaman yang sudah disetujui KaLab.
        </p>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold text-foreground">Siapa yang menggunakan SiLab</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.name} className="flex gap-4 rounded-xl border bg-background p-5">
                <r.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl bg-primary p-6 text-primary-foreground">
            <CalendarDays className="size-5" />
            <p className="flex-1 text-sm">Sudah punya akun? Masuk untuk melanjutkan praktikum atau pengajuan Anda.</p>
            <Button asChild variant="secondary">
              <Link href="/auth">Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        SiLab · Fakultas Ilmu Kesehatan UPN Veteran Jakarta
      </footer>
    </div>
  );
}
