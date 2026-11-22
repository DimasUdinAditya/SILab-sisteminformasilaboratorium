"use client";

import { useParams } from "@/lib/router-compat";
import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RegistrationBadge } from "@/components/admin/registration-badge";
import { PageHeader } from "@/components/app/page-header";
import { ReasonDialog } from "@/components/labman/reason-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { prodisQuery, registrationQuery, registrationsQuery } from "@/lib/admin-queries";
import { APP_ROLES, nimNipLabel, ROLE_LABELS, SELF_SIGNUP_ROLES, type AppRole } from "@/lib/roles";
import { signupRequiresProdi } from "@/lib/signup";


const fmt = (d: string) =>
  new Date(d).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default function RegistrationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(registrationQuery(id));
  const { data: prodis } = useQuery(prodisQuery);
  const reg = data?.reg;

  const [role, setRole] = useState<AppRole | "">("");
  const [prodiId, setProdiId] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Defaults follow what the applicant requested.
  useEffect(() => {
    if (!reg) return;
    setRole(reg.roles?.code && reg.roles.code !== "super_admin" ? reg.roles.code : "");
    setProdiId(reg.program_study_id ?? "");
  }, [reg]);

  async function done(message: string) {
    toast.success(message);
    await queryClient.invalidateQueries({ queryKey: registrationsQuery.queryKey });
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] });
    navigate({ to: "/admin/registrasi" });
  }

  async function approve() {
    if (!role) return void toast.error("Pilih role.");
    if (signupRequiresProdi(role) && !prodiId) return void toast.error("Pilih program studi untuk role ini.");
    setBusy(true);
    const { error } = await supabase.rpc("approve_registration", {
      p_registration_id: id,
      p_role: role,
      ...(prodiId ? { p_program_study_id: prodiId } : {}),
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setApproveOpen(false);
    await done(`Registrasi ${reg?.full_name} disetujui.`);
  }

  async function reject(reason: string) {
    const { error } = await supabase.rpc("reject_registration", { p_registration_id: id, p_reason: reason });
    if (error) {
      toast.error(error.message);
      return false;
    }
    await done(`Registrasi ${reg?.full_name} ditolak.`);
    return true;
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!reg) return <p className="text-sm text-muted-foreground">Registrasi tidak ditemukan.</p>;
  const pending = reg.status === "Menunggu";
  const requestedRole = reg.roles?.code;
  const roleOptions = SELF_SIGNUP_ROLES.slice().sort((a, b) => APP_ROLES.indexOf(a) - APP_ROLES.indexOf(b));
  const needsProdi = role ? signupRequiresProdi(role) : false;
  const prodiName = prodis?.find((p) => p.id === prodiId)?.name;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/admin/registrasi">
          <ArrowLeft /> Kembali ke daftar
        </Link>
      </Button>
      <PageHeader title={reg.full_name} description={`Registrasi dikirim ${fmt(reg.submitted_at)}`} actions={<RegistrationBadge status={reg.status} />} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold">Data pendaftar</h2>
          <dl className="grid gap-3 text-sm">
            <Row label="Nama lengkap" value={reg.full_name} />
            <Row label="Email" value={reg.email} />
            <Row label="Role diajukan" value={reg.roles?.name ?? "-"} />
            <Row label={nimNipLabel(requestedRole)} value={reg.nim_nip} />
            {requestedRole === "mahasiswa" && <Row label="Semester" value={reg.semester != null ? String(reg.semester) : "-"} />}
            <Row label="Program studi" value={reg.program_studies?.name ?? "-"} />
          </dl>
        </section>

        {pending ? (
          <section className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold">Keputusan</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">Role dan program studi bisa disesuaikan sebelum disetujui.</p>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ap-role">
                  Role <span className="text-destructive">*</span>
                </Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger id="ap-role">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ap-prodi">
                  Program studi {needsProdi ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(opsional)</span>}
                </Label>
                <Select value={prodiId} onValueChange={setProdiId}>
                  <SelectTrigger id="ap-prodi">
                    <SelectValue placeholder="Pilih program studi" />
                  </SelectTrigger>
                  <SelectContent>
                    {prodis?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => setApproveOpen(true)} disabled={!role || (needsProdi && !prodiId)}>
                  <Check /> Setujui
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => setRejectOpen(true)}>
                  <X /> Tolak
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold">Riwayat keputusan</h2>
            <ul className="space-y-3 text-sm">
              {data.approvals.map((a) => (
                <li key={a.id} className="rounded-lg bg-muted p-3">
                  <p className="font-medium">
                    {a.decision}
                    {a.decision === "Disetujui" && a.roles?.name ? ` sebagai ${a.roles.name}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.profiles?.name ?? "Super Admin"} · {fmt(a.decided_at)}
                  </p>
                  {a.rejection_reason && <p className="mt-2 whitespace-pre-line">{a.rejection_reason}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <AlertDialog open={approveOpen} onOpenChange={(o) => !busy && setApproveOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui registrasi?</AlertDialogTitle>
            <AlertDialogDescription>
              {reg.full_name} akan aktif sebagai <strong>{role ? ROLE_LABELS[role] : "-"}</strong>
              {prodiName ? <> di {prodiName}</> : null} dan bisa langsung masuk ke SiLab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <Button onClick={approve} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Setujui
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Tolak registrasi?"
        description={`Alasan akan ditampilkan kepada ${reg.full_name} di halaman Status Registrasi.`}
        label="Alasan penolakan"
        required
        confirmLabel="Tolak"
        destructive
        onConfirm={reject}
      />
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
