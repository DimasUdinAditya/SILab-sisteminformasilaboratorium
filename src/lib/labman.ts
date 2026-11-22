import type { Database } from "@/integrations/supabase/types";

type Enums = Database["public"]["Enums"];
export type LabRequestStatus = Enums["lab_request_status"];
export type BorrowingStatus = Enums["borrowing_status"];
export type ItemType = Enums["item_type"];
export type CalibrationStatus = Enums["calibration_status"];
export type StockMovementType = Enums["stock_movement_type"];
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const MAX_LAB_FILE_MB = 5;

export const LAB_REQUEST_STATUS_META: Record<LabRequestStatus, { label: string; tone: Tone }> = {
  Diajukan: { label: "Diajukan", tone: "info" },
  Disetujui: { label: "Disetujui", tone: "success" },
  Ditolak: { label: "Ditolak", tone: "danger" },
};

export const BORROWING_STATUS_META: Record<BorrowingStatus, { label: string; tone: Tone }> = {
  Diajukan: { label: "Diajukan", tone: "info" },
  Disetujui: { label: "Disetujui", tone: "info" },
  Dipinjam: { label: "Dipinjam", tone: "warning" },
  Dikembalikan: { label: "Dikembalikan", tone: "info" },
  Ditunggu: { label: "Ditunggu", tone: "warning" },
  Dikonfirmasi: { label: "Dikonfirmasi", tone: "success" },
  Ditolak: { label: "Ditolak", tone: "danger" },
};

export const LAB_REQUEST_STATUSES: LabRequestStatus[] = ["Diajukan", "Disetujui", "Ditolak"];
export const BORROWING_STATUSES: BorrowingStatus[] = [
  "Diajukan",
  "Disetujui",
  "Dipinjam",
  "Dikembalikan",
  "Ditunggu",
  "Dikonfirmasi",
  "Ditolak",
];
/** Borrowings that are finished and belong in Riwayat Peminjaman. */
export const FINISHED_BORROWING: BorrowingStatus[] = ["Dikonfirmasi", "Ditolak"];

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  in: "Masuk",
  out: "Keluar",
  adjustment: "Penyesuaian",
};

// ---------------------------------------------------------------- dates (Asia/Jakarta, UTC+7)

/** Today's date in Jakarta as YYYY-MM-DD. */
export function jakartaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Earliest date a lab request or borrowing may be for: H-1, i.e. tomorrow. */
export function minRequestDate(now: Date = new Date()): string {
  return addDays(jakartaToday(now), 1);
}

export function isAtLeastTomorrow(date: string, now: Date = new Date()): boolean {
  return !!date && date >= minRequestDate(now);
}

/** Monday of the week containing the date. */
export function weekStart(date: string): string {
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Minggu
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function weekDays(start: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function formatDate(date: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(ts: string | null | undefined) {
  if (!ts) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(ts));
}

export const formatTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : "-");

// ---------------------------------------------------------------- schedule & slots

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Two time ranges on the same day overlap when each starts before the other ends. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 17;

export type Slot = { start: string; end: string };
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** One-hour bookable slots during lab opening hours. */
export const DAY_SLOTS: Slot[] = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => ({
  start: hh(OPEN_HOUR + i),
  end: hh(OPEN_HOUR + i + 1),
}));

type Busy = { start_time: string; end_time: string };

export function isSlotFree(slot: Slot, entries: Busy[]): boolean {
  return !entries.some((e) => overlaps(slot.start, slot.end, e.start_time, e.end_time));
}

/** Selected slot indexes → one time range, or null when empty or not contiguous. */
export function rangeFromSlots(indexes: number[]): Slot | null {
  if (!indexes.length) return null;
  const s = [...new Set(indexes)].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]! + 1) return null;
  const first = DAY_SLOTS[s[0]!];
  const last = DAY_SLOTS[s[s.length - 1]!];
  return first && last ? { start: first.start, end: last.end } : null;
}

// ---------------------------------------------------------------- calibration

export type CalibrationState = { label: string; tone: Tone; borrowable: boolean };

/** Mirrors public.equipment_calibration_ok(): expired or missing calibration blocks borrowing. */
export function calibrationState(requires: boolean, next: string | null | undefined, today: string = jakartaToday()): CalibrationState {
  if (!requires) return { label: "Tidak wajib", tone: "neutral", borrowable: true };
  if (!next) return { label: "Belum dikalibrasi", tone: "danger", borrowable: false };
  if (next < today) return { label: "Kedaluwarsa", tone: "danger", borrowable: false };
  if (next <= addDays(today, 30)) return { label: "Mendekati", tone: "warning", borrowable: true };
  return { label: "Valid", tone: "success", borrowable: true };
}

export function latestNextCalibration(rows: { next_calibration: string | null }[] | null | undefined): string | null {
  return (rows ?? []).reduce<string | null>((max, r) => (r.next_calibration && (!max || r.next_calibration > max) ? r.next_calibration : max), null);
}

// ---------------------------------------------------------------- borrowing

type BorrowingLike = { status: BorrowingStatus; return_due_date: string | null; is_overdue: boolean };

/** Overdue while items are still out after the due date, or when they came back late. */
export function isOverdue(b: BorrowingLike, today: string = jakartaToday()): boolean {
  if (b.is_overdue) return true;
  return b.status === "Dipinjam" && !!b.return_due_date && b.return_due_date < today;
}

export type KalabAction = "approve" | "reject" | "readiness" | "complete" | "verify" | "close";

/** What KaLab can do next for a borrowing, per status. */
export function kalabActions(status: BorrowingStatus, hasAlat: boolean): KalabAction[] {
  switch (status) {
    case "Diajukan":
      return ["approve", "reject"];
    case "Disetujui":
      return ["readiness"];
    case "Dipinjam":
      return hasAlat ? [] : ["complete"];
    case "Dikembalikan":
      return ["verify"];
    case "Ditunggu":
      return ["close"];
    default:
      return [];
  }
}

/** The borrower uploads return evidence only while items are out and at least one is an Alat. */
export function canSubmitReturn(status: BorrowingStatus, hasAlat: boolean): boolean {
  return status === "Dipinjam" && hasAlat;
}

/** Status the borrowing moves to after KaLab verifies the returned items. */
export function verificationOutcome(result: "Sesuai" | "Tidak_Sesuai"): BorrowingStatus {
  return result === "Sesuai" ? "Dikonfirmasi" : "Ditunggu";
}

// ---------------------------------------------------------------- files

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const DOC_TYPES = [...PHOTO_TYPES, "application/pdf"];

/** Returns an error message, or null when the file is allowed (jpg/png[/pdf], max 5 MB). */
export function validateLabFile(file: { type: string; size: number; name: string }, kind: "photo" | "document"): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = kind === "photo" ? ["jpg", "jpeg", "png"] : ["jpg", "jpeg", "png", "pdf"];
  const allowedType = kind === "photo" ? PHOTO_TYPES : DOC_TYPES;
  if (!allowedType.includes(file.type) || !allowedExt.includes(ext))
    return kind === "photo" ? "Hanya foto JPG atau PNG." : "Hanya file JPG, PNG, atau PDF.";
  if (file.size > MAX_LAB_FILE_MB * 1024 * 1024) return `Ukuran file maksimal ${MAX_LAB_FILE_MB} MB.`;
  return null;
}

export function labError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    const code = "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23503" || /violates foreign key/i.test(msg)) return "Data masih dipakai transaksi sehingga tidak dapat dihapus.";
    if (code === "23505" || /duplicate key/i.test(msg)) return "Kode atau nama sudah dipakai.";
    if (/row-level security|Akses ditolak|permission denied/i.test(msg)) return "Akses ditolak.";
    return msg;
  }
  return "Terjadi kesalahan.";
}
