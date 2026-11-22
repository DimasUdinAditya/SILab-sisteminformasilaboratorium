"use server";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/integrations/supabase/admin";
import { requireUser } from "@/lib/auth.server";

const Input = z.object({ kind: z.enum(["lab", "borrowing"]), id: z.string().uuid() });
const LinkInput = Input.extend({ download: z.boolean().optional() });

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** KaLab approval: runs the approve RPC as the KaLab, then issues the signed letter. */
export async function approveWithLetter(raw: unknown) {
  const data = Input.parse(raw);
  const { supabase, userId } = await requireUser();
  const { data: role } = await supabase.rpc("current_app_role");
  if (role !== "kalab") throw new Error("Akses ditolak");
  const { data: sig } = await supabase
    .from("kalab_signatures")
    .select("id")
    .eq("kalab_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!sig) throw new Error("Unggah tanda tangan Anda di halaman Profil Akun sebelum menyetujui.");

  const { error } =
    data.kind === "lab"
      ? await supabase.rpc("approve_lab_request", { _id: data.id })
      : await supabase.rpc("approve_borrowing", { _id: data.id });
  if (error) throw new Error(error.message);

  try {
    const { issueLetter } = await import("@/lib/letters.server");
    const doc = await issueLetter(data.kind, data.id);
    return { letter: true as const, letterNumber: doc.letter_number };
  } catch (e) {
    console.error("issueLetter failed", e);
    return { letter: false as const, letterError: message(e) };
  }
}

/** Retry for KaLab when a letter is missing on an approved request. */
export async function issueOfficialLetter(raw: unknown) {
  const data = Input.parse(raw);
  const { supabase, userId } = await requireUser();
  const { data: role } = await supabase.rpc("current_app_role");
  if (role !== "kalab") throw new Error("Akses ditolak");
  const { loadRequest, issueLetter } = await import("@/lib/letters.server");
  const req = await loadRequest(data.kind, data.id);
  if (!req || req.kalabId !== userId) throw new Error("Akses ditolak");
  const doc = await issueLetter(data.kind, data.id);
  return { letterNumber: doc.letter_number };
}

/**
 * Short-lived link to an official letter. Allowed only once approved, and only for the
 * requester, the KaLab of that lab, or the Dekan when the request is in the endorsement queue.
 */
async function getLetterLinkOrThrow(raw: unknown) {
  const data = LinkInput.parse(raw);
  const { supabase, userId } = await requireUser();
  const { loadRequest, isApprovedStatus, findDocument, LETTER_BUCKET } = await import("@/lib/letters.server");
  const req = await loadRequest(data.kind, data.id);
  if (!req) throw new Error("Pengajuan tidak ditemukan");

  const { data: role } = await supabase.rpc("current_app_role");
  let allowed = req.requesterId === userId || (role === "kalab" && req.kalabId === userId);
  if (!allowed && role === "dekan") {
    const { data: e } = await supabase
      .from("borrowing_endorsements")
      .select("id")
      .eq(data.kind === "lab" ? "lab_usage_request_id" : "borrowing_id", data.id)
      .maybeSingle();
    allowed = !!e;
  }
  if (!allowed) throw new Error("Akses ditolak: Anda tidak berhak mengakses surat ini.");
  if (!isApprovedStatus(data.kind, req.status)) throw new Error("Surat resmi belum tersedia: pengajuan belum disetujui.");

  const doc = await findDocument(data.kind, data.id);
  if (!doc) throw new Error("Surat resmi belum diterbitkan.");
  const admin = createSupabaseAdminClient();
  const fileName = `Surat-${(doc.letter_number ?? "SiLab").replace(/\//g, "-")}.pdf`;
  const { data: signed, error } = await admin.storage
    .from(LETTER_BUCKET)
    .createSignedUrl(doc.file_url, 120, data.download ? { download: fileName } : undefined);
  if (error || !signed) throw new Error("Gagal membuat tautan surat");
  return { url: signed.signedUrl, letterNumber: doc.letter_number, issuedAt: doc.issued_at, fileName };
}

export type LetterLinkResult =
  | { ok: true; url: string; letterNumber: string | null; issuedAt: string | null; fileName: string }
  | { ok: false; error: string };

/**
 * Expected failures (not approved yet, letter not issued, no access) return a message instead of throwing.
 * Thrown errors reach the browser as a generic 500 in production, so the UI could not show the reason.
 */
export async function getLetterLink(raw: unknown): Promise<LetterLinkResult> {
  try {
    return { ok: true, ...(await getLetterLinkOrThrow(raw)) };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
