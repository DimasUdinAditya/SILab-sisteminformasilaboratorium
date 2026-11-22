"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { AuthLayout } from "@/components/app/auth-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccountStatus, fetchMe, INACTIVE_MESSAGE, meQueryOptions } from "@/lib/profile";


export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setLoading(false);
      setError(
        /banned/i.test(authError.message)
          ? INACTIVE_MESSAGE
          : /not confirmed/i.test(authError.message)
            ? "Email belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim ke email Anda."
            : "Email atau password salah.",
      );
      return;
    }
    const status = await fetchAccountStatus().catch(() => "pending" as const);
    if (status === "pending") {
      // No profile yet: the account is waiting for (or was refused) approval.
      router.replace("/status-registrasi");
      return;
    }
    const me = status === "active" ? await fetchMe().catch(() => null) : null;
    if (!me || !me.is_active) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(INACTIVE_MESSAGE);
      return;
    }
    queryClient.setQueryData(meQueryOptions.queryKey, me);
    router.replace("/dashboard");
  }

  return (
    <AuthLayout title="Masuk ke SiLab" description="Masuk dengan email dan password akun SiLab Anda.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@kampus.ac.id" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/lupa-password" className="text-xs font-medium text-secondary hover:underline">
              Lupa password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Masuk
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-medium text-secondary hover:underline">
            Daftar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
