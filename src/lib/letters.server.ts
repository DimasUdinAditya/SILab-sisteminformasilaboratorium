import "server-only";

import { createSupabaseAdminClient } from "@/integrations/supabase/admin";
import { htmlToPdf } from "@/lib/html-pdf";
import { fillTemplate, letterNumber, SIGNATURE_MARKER, toLetterData, type LetterItem, type LetterKind, type LetterSource } from "@/lib/letter-template";

const supabaseAdmin = createSupabaseAdminClient();

export const LETTER_BUCKET = "letters";

const APPROVED_BORROWING = ["Disetujui", "Dipinjam", "Dikembalikan", "Ditunggu", "Dikonfirmasi"];

export function isApprovedStatus(kind: LetterKind, status: string) {
  return kind === "lab" ? status === "Disetujui" : APPROVED_BORROWING.includes(status);
}

type Loaded = { source: LetterSource; status: string; approvedBy: string | null; requesterId: string; kalabId: string };

export async function loadRequest(kind: LetterKind, id: string): Promise<Loaded | null> {
  if (kind === "lab") {
    const { data, error } = await supabaseAdmin
      .from("lab_usage_requests")
      .select(
        "id, status, usage_date, start_time, end_time, purpose, approved_at, approved_by, requester_id, laboratories(name, kalab_id), requester:profiles!lab_usage_requests_requester_id_fkey(name, nim_nip), approver:profiles!lab_usage_requests_approved_by_fkey(name)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      status: data.status,
      approvedBy: data.approved_by,
      requesterId: data.requester_id,
      kalabId: data.laboratories?.kalab_id ?? "",
      source: {
        kind,
        requesterName: data.requester?.name ?? "-",
        nimNip: data.requester?.nim_nip ?? null,
        labName: data.laboratories?.name ?? "-",
        purpose: data.purpose,
        date: data.usage_date,
        startTime: data.start_time,
        endTime: data.end_time,
        approvedAt: data.approved_at,
        kalabName: data.approver?.name ?? null,
      },
    };
  }
  const { data, error } = await supabaseAdmin
    .from("equipment_borrowings")
    .select(
      "id, status, borrow_date, return_due_date, purpose, approved_at, approved_by, borrower_id, laboratories(name, kalab_id), borrower:profiles!equipment_borrowings_borrower_id_fkey(name, nim_nip), approver:profiles!equipment_borrowings_approved_by_fkey(name), borrowing_items(item_type, quantity, equipment(name), consumables(name, unit))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const items: LetterItem[] = data.borrowing_items.map((i) => ({
    name: i.equipment?.name ?? i.consumables?.name ?? "Item",
    type: i.item_type,
    quantity: i.quantity,
    unit: i.consumables?.unit ?? "unit",
  }));
  return {
    status: data.status,
    approvedBy: data.approved_by,
    requesterId: data.borrower_id,
    kalabId: data.laboratories?.kalab_id ?? "",
    source: {
      kind,
      requesterName: data.borrower?.name ?? "-",
      nimNip: data.borrower?.nim_nip ?? null,
      labName: data.laboratories?.name ?? "-",
      purpose: data.purpose,
      date: data.borrow_date,
      returnDue: data.return_due_date,
      items,
      approvedAt: data.approved_at,
      kalabName: data.approver?.name ?? null,
    },
  };
}

const docColumn = (kind: LetterKind) => (kind === "lab" ? "lab_usage_request_id" : "borrowing_id");

export async function findDocument(kind: LetterKind, id: string) {
  const { data, error } = await supabaseAdmin
    .from("request_documents")
    .select("id, file_url, letter_number, issued_at")
    .eq(docColumn(kind), id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Renders the official signed PDF, stores it privately and records it. Idempotent. */
export async function issueLetter(kind: LetterKind, id: string) {
  const existing = await findDocument(kind, id);
  if (existing) return existing;

  const req = await loadRequest(kind, id);
  if (!req) throw new Error("Pengajuan tidak ditemukan");
  if (!isApprovedStatus(kind, req.status)) throw new Error("Surat resmi hanya untuk pengajuan yang sudah disetujui");
  if (!req.approvedBy) throw new Error("Data persetujuan KaLab tidak lengkap");

  const requestType = kind === "lab" ? "lab_usage" : "borrowing";
  const { data: template } = await supabaseAdmin
    .from("document_templates")
    .select("id, template_html")
    .eq("request_type", requestType)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!template) throw new Error("Template surat belum tersedia");

  const { data: sig } = await supabaseAdmin
    .from("kalab_signatures")
    .select("id, signature_file")
    .eq("kalab_id", req.approvedBy)
    .eq("is_active", true)
    .maybeSingle();
  if (!sig) throw new Error("Tanda tangan KaLab belum diunggah");
  const { data: sigBlob, error: sigErr } = await supabaseAdmin.storage.from("signatures").download(sig.signature_file);
  if (sigErr || !sigBlob) throw new Error("Tanda tangan KaLab tidak dapat dibaca");
  const sigBytes = new Uint8Array(await sigBlob.arrayBuffer());
  const mime = sig.signature_file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  const now = new Date();
  const year = new Date(now.getTime() + 7 * 3600_000).getUTCFullYear();
  const { count } = await supabaseAdmin
    .from("request_documents")
    .select("id", { count: "exact", head: true })
    .gte("issued_at", `${year}-01-01T00:00:00+07:00`);
  const number = letterNumber((count ?? 0) + 1, kind, now);

  const html = fillTemplate(template.template_html, toLetterData({ ...req.source, number }), SIGNATURE_MARKER);
  const pdf = await htmlToPdf(html, {
    signature: { bytes: sigBytes, mime },
    footer: `Surat resmi SiLab · ${number} · ditandatangani secara elektronik oleh Kepala Laboratorium`,
  });

  const path = `${kind}/${id}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(LETTER_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`Gagal menyimpan surat: ${upErr.message}`);

  const { data: doc, error: insErr } = await supabaseAdmin
    .from("request_documents")
    .insert({
      template_id: template.id,
      signature_id: sig.id,
      lab_usage_request_id: kind === "lab" ? id : null,
      borrowing_id: kind === "borrowing" ? id : null,
      letter_number: number,
      file_url: path,
      is_signed: true,
      issued_by: req.approvedBy,
    })
    .select("id, file_url, letter_number, issued_at")
    .single();
  if (insErr) {
    // A parallel call may have issued it first.
    const again = await findDocument(kind, id);
    if (again) return again;
    throw new Error(insErr.message);
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: req.requesterId,
    type: "letter_issued",
    title: "Surat resmi tersedia",
    message: `Surat ${number} untuk ${kind === "lab" ? "penggunaan" : "peminjaman di"} ${req.source.labName} sudah bisa diunduh.`,
    link_url: kind === "lab" ? `/laboratorium/pengajuan/${id}` : `/peminjaman/${id}`,
  });
  return doc;
}
