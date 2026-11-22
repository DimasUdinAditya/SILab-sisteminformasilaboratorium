import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { LetterKind } from "@/lib/letter-template";

export const templateQuery = (kind: LetterKind) =>
  queryOptions({
    queryKey: ["labman", "template", kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, name, template_html, version")
        .eq("request_type", kind === "lab" ? "lab_usage" : "borrowing")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Official letter metadata (RLS: requester, KaLab of the lab, Dekan in the queue). */
export const documentQuery = (kind: LetterKind, id: string) =>
  queryOptions({
    queryKey: ["labman", "document", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_documents")
        .select("id, letter_number, issued_at")
        .eq(kind === "lab" ? "lab_usage_request_id" : "borrowing_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export type EndorsementInfo = { status: "Menunggu_Pengesahan" | "Disahkan"; created_at: string; endorsed_at: string | null };

export const endorsementStatusQuery = (kind: LetterKind, id: string) =>
  queryOptions({
    queryKey: ["labman", "endorsement-status", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_endorsement_status", {
        _lab: kind === "lab" ? id : (null as unknown as string),
        _borrow: kind === "borrowing" ? id : (null as unknown as string),
      });
      if (error) throw error;
      return (data as EndorsementInfo | null) ?? null;
    },
  });

export const mySignatureQuery = (meId: string) =>
  queryOptions({
    queryKey: ["labman", "signature", meId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kalab_signatures")
        .select("id, signature_file, is_active")
        .eq("kalab_id", meId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
