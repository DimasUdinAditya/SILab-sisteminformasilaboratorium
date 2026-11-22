/**
 * Letter templates are HTML with {{placeholders}}. The same filled HTML feeds the
 * browser preview (status Diajukan) and the official PDF (status Disetujui).
 */
export type LetterKind = "lab" | "borrowing";

export type LetterItem = { name: string; type: "Alat" | "Bahan"; quantity: number; unit: string };

export type LetterData = {
  nomor_surat: string;
  nama_pemohon: string;
  nim_nip: string;
  jenis_pengajuan: string;
  laboratorium: string;
  tujuan: string;
  tanggal: string;
  waktu: string;
  items: LetterItem[];
  tanggal_persetujuan: string;
  nama_kalab: string;
};

export const PLACEHOLDERS = [
  "nomor_surat",
  "nama_pemohon",
  "nim_nip",
  "jenis_pengajuan",
  "laboratorium",
  "tujuan",
  "tanggal",
  "waktu",
  "daftar_item",
  "tanggal_persetujuan",
  "nama_kalab",
  "tanda_tangan",
  "tanda_tangan_dekan",
] as const;

export const JENIS_LABEL: Record<LetterKind, string> = {
  lab: "Penggunaan Laboratorium",
  borrowing: "Peminjaman Alat & Bahan",
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function itemsHtml(items: LetterItem[]): string {
  if (!items.length) return "<p>-</p>";
  return `<ol>${items
    .map(
      (i) =>
        `<li>${escapeHtml(i.name)} — ${i.quantity} ${escapeHtml(i.unit)} (${i.type === "Alat" ? "alat, wajib dikembalikan" : "bahan habis pakai"})</li>`,
    )
    .join("")}</ol>`;
}

/**
 * Fills the template. `signatureHtml` replaces {{tanda_tangan}}: an `<img data-signature>`
 * marker for the PDF, or a blank space for the unsigned preview.
 */
export function fillTemplate(template: string, data: LetterData, signatureHtml: string, deanSignatureHtml = ""): string {
  const values: Record<string, string> = {
    nomor_surat: escapeHtml(data.nomor_surat),
    nama_pemohon: escapeHtml(data.nama_pemohon),
    nim_nip: escapeHtml(data.nim_nip || "-"),
    jenis_pengajuan: escapeHtml(data.jenis_pengajuan),
    laboratorium: escapeHtml(data.laboratorium),
    tujuan: escapeHtml(data.tujuan),
    tanggal: escapeHtml(data.tanggal),
    waktu: escapeHtml(data.waktu),
    daftar_item: itemsHtml(data.items),
    tanggal_persetujuan: escapeHtml(data.tanggal_persetujuan),
    nama_kalab: escapeHtml(data.nama_kalab),
    tanda_tangan: signatureHtml,
    tanda_tangan_dekan: deanSignatureHtml,
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string) => values[key] ?? m);
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** "2026-11-17" → "17 November 2026" (date-only strings, no timezone shift). */
export function longDate(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** Timestamp → Jakarta date, e.g. "16 November 2026". */
export function longDateJakarta(ts: string | Date): string {
  const d = new Date(new Date(ts).getTime() + 7 * 3600_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** e.g. "007/SILAB-LAB/XI/2026" */
export function letterNumber(seq: number, kind: LetterKind, issuedAt: Date): string {
  const d = new Date(issuedAt.getTime() + 7 * 3600_000);
  return `${String(seq).padStart(3, "0")}/SILAB-${kind === "lab" ? "LAB" : "PNJ"}/${ROMAN[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}

export const SIGNATURE_MARKER = '<img data-signature="1" />';
export const DEAN_SIGNATURE_MARKER = '<img data-signature="dean" />';

/** Normalized request data shared by the browser preview and the server PDF. */
export type LetterSource = {
  kind: LetterKind;
  requesterName: string;
  nimNip: string | null;
  labName: string;
  purpose: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  returnDue?: string | null;
  items?: LetterItem[];
  approvedAt?: string | null;
  kalabName?: string | null;
  number?: string | null;
};

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

export function toLetterData(s: LetterSource): LetterData {
  const items = s.items ?? [];
  const hasAlat = items.some((i) => i.type === "Alat");
  return {
    nomor_surat: s.number ?? "— (diterbitkan setelah disetujui)",
    nama_pemohon: s.requesterName,
    nim_nip: s.nimNip ?? "-",
    jenis_pengajuan: JENIS_LABEL[s.kind],
    laboratorium: s.labName,
    tujuan: s.purpose,
    tanggal: s.kind === "lab" ? longDate(s.date) : `${longDate(s.date)}${hasAlat && s.returnDue ? ` s.d. ${longDate(s.returnDue)}` : ""}`,
    waktu:
      s.kind === "lab"
        ? `${hhmm(s.startTime)}–${hhmm(s.endTime)} WIB`
        : hasAlat
          ? `Alat dikembalikan paling lambat ${s.returnDue ? longDate(s.returnDue) : "-"}`
          : "Bahan habis pakai (tidak dikembalikan)",
    items,
    tanggal_persetujuan: s.approvedAt ? longDateJakarta(s.approvedAt) : "—",
    nama_kalab: s.kalabName ?? "Kepala Laboratorium",
  };
}
