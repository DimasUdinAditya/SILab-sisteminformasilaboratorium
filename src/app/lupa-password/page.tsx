"use client";

import { Link } from "@/lib/router-compat";
import { Loader2, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AuthLayout } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";


export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthLayout title="Lupa password" description="Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru.">
      {sent ? (
        <div className="rounded-xl border bg-primary-soft p-5 text-sm">
          <MailCheck className="mb-2 size-5 text-secondary" />
          Jika email terdaftar, tautan atur ulang password telah dikirim ke <b>{email}</b>. Periksa juga folder spam.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Kirim tautan
          </Button>
        </form>
      )}
      <Link to="/auth" className="mt-6 block text-center text-sm font-medium text-secondary hover:underline">
        Kembali ke halaman masuk
      </Link>
    </AuthLayout>
  );
}
