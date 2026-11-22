"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uuidv7 } from "@/lib/vlab";

const MAX = 2 * 1024 * 1024;

export function SignatureSection({ meId, role = "kalab" }: { meId: string; role?: "kalab" | "dekan" }) {
  const qc = useQueryClient();
  // KaLab and Dekan keep their signatures in different tables; both are used on official letters.
  const { data: sig } = useQuery({
    queryKey: ["labman", "signature", role, meId],
    queryFn: async () => {
      const q = role === "dekan"
        ? supabase.from("dean_signatures").select("id, signature_file").eq("dean_id", meId)
        : supabase.from("kalab_signatures").select("id, signature_file").eq("kalab_id", meId);
      const { data, error } = await q.eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: url } = useQuery({
    queryKey: ["signature-url", sig?.signature_file],
    enabled: !!sig?.signature_file,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("signatures").createSignedUrl(sig!.signature_file, 600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) return void toast.error("Format harus PNG atau JPG.");
    if (file.size > MAX) return void toast.error("Ukuran maksimal 2 MB.");
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${meId}/${uuidv7()}.${ext}`;
      const { error } = await supabase.storage.from("signatures").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { error: e2 } = await supabase.rpc(role === "dekan" ? "set_dean_signature" : "set_kalab_signature", { _path: path });
      if (e2) throw e2;
      await qc.invalidateQueries({ queryKey: ["labman", "signature", role, meId] });
      toast.success("Tanda tangan tersimpan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah tanda tangan.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-card lg:col-span-2">
      <h2 className="text-base font-semibold">Tanda tangan digital</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dipakai pada surat resmi saat Anda menyetujui pengajuan. PNG atau JPG, maksimal 2 MB (disarankan latar transparan).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="flex h-24 w-56 items-center justify-center rounded-lg border border-dashed bg-muted/30">
          {url ? <img src={url} alt="Tanda tangan" className="max-h-20 max-w-52 object-contain" /> : <span className="text-xs text-muted-foreground">Belum ada tanda tangan</span>}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Upload />} {sig ? "Ganti tanda tangan" : "Unggah tanda tangan"}
        </Button>
      </div>
    </section>
  );
}
