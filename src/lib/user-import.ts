import { isAppRole, ROLES_REQUIRING_PRODI, type AppRole } from "@/lib/roles";

export const CSV_COLUMNS = ["name", "email", "role", "nim_nip", "prodi_code"] as const;
/** Optional column: only read for mahasiswa rows. */
export const CSV_OPTIONAL_COLUMNS = ["semester"] as const;

export type UserRow = {
  name: string;
  email: string;
  role: string;
  nim_nip: string;
  prodi_code: string;
  /** Student semester (1–14) as text; empty when not given. */
  semester?: string | undefined;
};

export type RowFailure = { line: number; email: string; reason: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimal RFC4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Parses the import file. Header must contain name,email,role,nim_nip,prodi_code. */
export function parseUsersCsv(text: string): { rows: UserRow[]; error: string | null } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], error: "File kosong." };
  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Kolom wajib tidak ada: ${missing.join(", ")}` };
  const idx = Object.fromEntries(CSV_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<
    (typeof CSV_COLUMNS)[number],
    number
  >;
  const semIdx = header.indexOf("semester");
  const rows = table.slice(1).map((r) => ({
    name: (r[idx.name] ?? "").trim(),
    email: (r[idx.email] ?? "").trim().toLowerCase(),
    role: (r[idx.role] ?? "").trim().toLowerCase(),
    nim_nip: (r[idx.nim_nip] ?? "").trim(),
    prodi_code: (r[idx.prodi_code] ?? "").trim().toUpperCase(),
    semester: semIdx >= 0 ? (r[semIdx] ?? "").trim() : "",
  }));
  return { rows, error: null };
}

/** Returns a failure reason or null when the row is valid. */
export function validateUserRow(row: UserRow, knownProdiCodes: Set<string>): string | null {
  if (!row.name) return "Nama wajib diisi";
  if (!EMAIL_RE.test(row.email)) return "Format email tidak valid";
  if (!isAppRole(row.role)) return `Role "${row.role}" tidak dikenal`;
  if (ROLES_REQUIRING_PRODI.includes(row.role as AppRole) && !row.prodi_code)
    return "Kode prodi wajib untuk role ini";
  if (row.prodi_code && !knownProdiCodes.has(row.prodi_code))
    return `Kode prodi "${row.prodi_code}" tidak ditemukan`;
  if (row.role === "mahasiswa" && row.semester && parseSemester(row.semester) === null)
    return "Semester harus angka 1–14";
  return null;
}

/** Semester 1–14, or null when empty/invalid. */
export function parseSemester(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 14 ? n : null;
}

/**
 * Validates all rows: rejects invalid rows, emails already registered,
 * and repeated emails within the same file (all but the first occurrence).
 */
export function checkImportRows(
  rows: UserRow[],
  knownProdiCodes: Set<string>,
  existingEmails: Set<string>,
): { valid: { line: number; row: UserRow }[]; failed: RowFailure[] } {
  const seen = new Set<string>();
  const valid: { line: number; row: UserRow }[] = [];
  const failed: RowFailure[] = [];
  rows.forEach((row, i) => {
    const line = i + 2; // header is line 1
    const reason =
      validateUserRow(row, knownProdiCodes) ??
      (existingEmails.has(row.email)
        ? "Email sudah terdaftar"
        : seen.has(row.email)
          ? "Email duplikat di dalam file"
          : null);
    if (reason) failed.push({ line, email: row.email, reason });
    else valid.push({ line, row });
    if (row.email) seen.add(row.email);
  });
  return { valid, failed };
}
