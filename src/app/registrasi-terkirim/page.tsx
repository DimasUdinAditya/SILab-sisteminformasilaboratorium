"use client";

import { Suspense } from "react";

import { useSearch } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { MailCheck } from "lucide-react";

import { AuthLayout } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";


function Content() {
  const { email } = useSearch();
  return (
    <AuthLayout title="Registrasi terkirim" description="Akun Anda menunggu persetujuan Super Admin.">
      <div className="space-y-5">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-6" />
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
          <li>
            Buka email konfirmasi yang kami kirim{email ? <> ke <span className="font-medium">{email}</span></> : null}, lalu
            klik tautannya.
          </li>
          <li>Super Admin memeriksa data registrasi Anda.</li>
          <li>Setelah disetujui, masuk dengan email dan password yang Anda daftarkan.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Sebelum disetujui, Anda hanya bisa melihat halaman Status Registrasi setelah masuk.
        </p>
        <Button asChild className="w-full">
          <Link to="/auth">Ke halaman Masuk</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
