"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, LogOut, XCircle } from "lucide-react";

import { Logo } from "@/components/app/logo";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-sign-out";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccountStatus } from "@/lib/profile";
import { isAppRole, nimNipLabel, ROLE_LABELS } from "@/lib/roles";


const fmt = (d: string) =>
  new Date(d).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default function StatusPage() {
  const router = useRouter();
  useEffect(() => {
    // Accounts with a profile never see this page.
    void fetchAccountStatus().then((s) => {
      if (s !== "pending") router.replace("/dashboard");
    });
  }, [router]);
  const signOut = useSignOut();
  const { data, isLoading } = useQuery({
    queryKey: ["my-registration"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: reg, error } = await supabase
        .from("user_registrations")
        .select("id, full_name, nim_nip, semester, email, status, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      let reason: string | null = null;
      if (reg?.status === "Ditolak") {
        const { data: appr } = await supabase
          .from("registration_approvals")
          .select("rejection_reason, decided_at")
          .eq("registration_id", reg.id)
          .eq("decision", "Ditolak")
          .order("decided_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        reason = appr?.rejection_reason ?? null;
      }
      const requested = String(auth.user?.user_metadata?.["requested_role"] ?? "");
      return { reg, reason, role: isAppRole(requested) ? requested : null };
    },
  });

  const reg = data?.reg;
  const rejected = reg?.status === "Ditolak";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b bg-surface px-6">
        <Logo />
        <Button variant="outline" onClick={signOut}>
          <LogOut /> Logout
        </Button>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : !reg ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <h1 className="text-xl font-bold">Akun belum terdaftar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Akun ini belum memiliki data registrasi di SiLab. Hubungi Super Admin.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-8 shadow-card">
            <div
              className={`mb-4 flex size-12 items-center justify-center rounded-full ${rejected ? "bg-danger-soft text-destructive" : "bg-primary-soft text-primary"}`}
            >
              {rejected ? <XCircle className="size-6" /> : <Clock className="size-6" />}
            </div>
            <StatusBadge label={rejected ? "Ditolak" : "Menunggu Persetujuan"} tone={rejected ? "danger" : "warning"} />
            <h1 className="mt-3 text-xl font-bold">{rejected ? "Registrasi ditolak" : "Registrasi menunggu persetujuan"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {rejected
                ? "Super Admin tidak menyetujui registrasi Anda."
                : "Akun Anda sedang diperiksa Super Admin. Anda bisa masuk ke SiLab setelah disetujui."}
            </p>
            {rejected && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-danger-soft p-4 text-sm">
                <p className="font-medium text-destructive">Alasan penolakan</p>
                <p className="mt-1 whitespace-pre-line text-foreground">{data?.reason ?? "-"}</p>
              </div>
            )}
            <dl className="mt-6 grid gap-3 text-sm">
              <Row label="Nama lengkap" value={reg.full_name} />
              <Row label="Email" value={reg.email} />
              <Row label="Role diajukan" value={data?.role ? ROLE_LABELS[data.role] : "-"} />
              <Row label={nimNipLabel(data?.role)} value={reg.nim_nip} />
              {reg.semester != null && <Row label="Semester" value={String(reg.semester)} />}
              <Row label="Tanggal daftar" value={fmt(reg.submitted_at)} />
            </dl>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
