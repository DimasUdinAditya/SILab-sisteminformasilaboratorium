"use client";

import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";

import { AuthLayout } from "@/components/app/auth-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { checkNimNipTaken } from "@/lib/registration.actions";
import { APP_ROLES, nimNipLabel, SELF_SIGNUP_ROLES, type AppRole } from "@/lib/roles";
import { signupErrorMessage, signupSchema, signupRequiresProdi, type SignupForm } from "@/lib/signup";


const empty: SignupForm = {
  role: "",
  full_name: "",
  nim_nip: "",
  semester: "",
  email: "",
  program_study_id: "",
  password: "",
  confirm: "",
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupForm>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupForm, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const checkNim = useServerFn(checkNimNipTaken);

  const { data: options } = useQuery({
    queryKey: ["signup-options"],
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("roles").select("id, code, name").neq("code", "super_admin"),
        supabase.from("program_studies").select("id, code, name").order("name"),
      ]);
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      const roles = (r.data ?? [])
        .filter((x) => SELF_SIGNUP_ROLES.includes(x.code))
        .sort((a, b) => APP_ROLES.indexOf(a.code) - APP_ROLES.indexOf(b.code));
      return { roles, prodis: p.data ?? [] };
    },
  });

  const role = form.role as AppRole | "";
  const isStudent = role === "mahasiswa";
  const needsProdi = signupRequiresProdi(role);
  const set = (k: keyof SignupForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof SignupForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SignupForm;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const v = parsed.data;
    const nim = await checkNim({ data: { nim_nip: v.nim_nip } }).catch(() => null);
    if (nim?.taken) {
      setLoading(false);
      return setServerError("NIM/NIP sudah terdaftar");
    }
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          signup_source: "self",
          requested_role: v.role,
          full_name: v.full_name,
          nim_nip: v.nim_nip,
          semester: v.semester,
          program_study_id: v.program_study_id,
        },
      },
    });
    setLoading(false);
    if (error) return setServerError(signupErrorMessage(error.message));
    // An already-registered email comes back as a user without identities.
    if (data.user && data.user.identities?.length === 0) return setServerError("Email sudah terdaftar.");
    if (data.session) return navigate({ to: "/status-registrasi", replace: true });
    navigate({ to: "/registrasi-terkirim", search: { email: v.email }, replace: true });
  }

  return (
    <AuthLayout title="Daftar akun SiLab" description="Akun aktif setelah disetujui Super Admin.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <Field label="Daftar sebagai" required error={errors.role}>
          <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v, semester: v === "mahasiswa" ? f.semester : "" }))}>
            <SelectTrigger id="su-role" aria-label="Daftar sebagai">
              <SelectValue placeholder="Pilih role" />
            </SelectTrigger>
            <SelectContent>
              {options?.roles.map((r) => (
                <SelectItem key={r.id} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Nama Lengkap" htmlFor="su-name" required error={errors.full_name}>
          <Input id="su-name" autoComplete="name" maxLength={120} value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} />
        </Field>
        <div className={isStudent ? "grid gap-4 sm:grid-cols-[1fr_7rem]" : ""}>
          <Field label={nimNipLabel(role)} htmlFor="su-nim" required error={errors.nim_nip}>
            <Input id="su-nim" maxLength={40} value={form.nim_nip} onChange={(e) => set("nim_nip")(e.target.value)} />
          </Field>
          {isStudent && (
            <Field label="Semester" htmlFor="su-sem" required error={errors.semester}>
              <Input id="su-sem" type="number" inputMode="numeric" min={1} max={14} value={form.semester} onChange={(e) => set("semester")(e.target.value)} />
            </Field>
          )}
        </div>
        <Field label="Email" htmlFor="su-email" required error={errors.email}>
          <Input id="su-email" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="nama@kampus.ac.id" />
        </Field>
        <Field label="Program Studi" required={needsProdi} error={errors.program_study_id}>
          <Select value={form.program_study_id || (needsProdi ? "" : "none")} onValueChange={(v) => set("program_study_id")(v === "none" ? "" : v)}>
            <SelectTrigger id="su-prodi" aria-label="Program Studi">
              <SelectValue placeholder="Pilih program studi" />
            </SelectTrigger>
            <SelectContent>
              {!needsProdi && <SelectItem value="none">Tidak ada</SelectItem>}
              {options?.prodis.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Password" htmlFor="su-pass" required error={errors.password}>
          <Input id="su-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password")(e.target.value)} placeholder="Minimal 8 karakter" />
        </Field>
        <Field label="Konfirmasi Password" htmlFor="su-confirm" required error={errors.confirm}>
          <Input id="su-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm")(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Daftar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/auth" className="font-medium text-secondary hover:underline">
            Masuk
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
