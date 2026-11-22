// Seeds dummy data for end-to-end testing of SiLab on the linked Supabase project.
// Uses the service-role key from .env.local. Safe to re-run: rows use fixed ids and are upserted.
// Only run this against a test project, never against production data.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function call(method, p, body, extra = {}) {
  const res = await fetch(`${URL_BASE}${p}`, { method, headers: { ...H, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function upsert(table, rows) {
  if (!rows.length) return;
  // PostgREST bulk inserts need identical keys per request: group rows by their key set, send one request per group.
  const groups = new Map();
  for (const r of rows) {
    const k = Object.keys(r).sort().join(",");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const group of groups.values()) {
    await call("POST", `/rest/v1/${table}?on_conflict=id`, group, { Prefer: "resolution=merge-duplicates,return=minimal" });
  }
}
async function getAll(p) {
  return call("GET", p);
}
async function uploadPng(bucket, objPath) {
  // 1x1 transparent PNG: enough to exercise the upload and signed-URL paths.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  const res = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${objPath}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "image/png", "x-upsert": "true" },
    body: png,
  });
  if (!res.ok) throw new Error(`upload ${bucket}/${objPath} -> ${res.status}: ${await res.text()}`);
}

// Deterministic UUIDs so the script can be re-run.
const id = (group, n) => `${group}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date();
const day = (offset, time = "00:00:00") => {
  const d = new Date(now.getTime() + offset * 86400000);
  return `${d.toISOString().slice(0, 10)}`;
};
const ts = (offset) => new Date(now.getTime() + offset * 86400000).toISOString();

// ---------- accounts that already exist in Auth (created manually) ----------
const EMAILS = {
  dosen: "abel@gmail.com",
  kalab: "aliya@gmail.com",
  admin: "admin@kampus.ac.id",
  mahasiswa: "rama@gmail.com",
};
const authUsers = (await getAll("/auth/v1/admin/users?per_page=1000")).users;
const uid = {};
for (const [role, email] of Object.entries(EMAILS)) {
  const u = authUsers.find((x) => x.email === email);
  if (!u) throw new Error(`Akun ${email} belum ada di Auth. Buat dulu di Authentication → Users.`);
  uid[role] = u.id;
}
const roles = await getAll("/rest/v1/roles?select=id,code");
const roleId = Object.fromEntries(roles.map((r) => [r.code, r.id]));
const prodis = await getAll("/rest/v1/program_studies?select=id,code");
const prodiId = Object.fromEntries(prodis.map((p) => [p.code, p.id]));
const P_KEP = prodiId["S1KEP"];
const P_GIZI = prodiId["S1GIZI"];
if (!P_KEP || !P_GIZI) throw new Error("Data akademik (prodi S1KEP/S1GIZI) belum ada. Terapkan migrasi 0014 dulu.");

// Remove the placeholder profile created earlier with the example UUID.
await call("DELETE", "/rest/v1/profiles?id=eq.a1b2c3d4-5678-90ab-cdef-1234567890ab", undefined, { Prefer: "return=minimal" }).catch(() => {});

// ---------- profiles ----------
await upsert("profiles", [
  { id: uid.admin, email: EMAILS.admin, name: "Super Admin", role_id: roleId.super_admin, is_active: true },
  { id: uid.kalab, email: EMAILS.kalab, name: "Aliya Zafira", role_id: roleId.kalab, program_study_id: P_KEP, nim_nip: "197811112005012001", is_active: true },
  { id: uid.dosen, email: EMAILS.dosen, name: "Abel Pratama", role_id: roleId.dosen, program_study_id: P_KEP, nim_nip: "198501012010011001", is_active: true },
  { id: uid.mahasiswa, email: EMAILS.mahasiswa, name: "Rama Saputra", role_id: roleId.mahasiswa, program_study_id: P_KEP, nim_nip: "2411001", semester: 3, is_active: true },
]);

// ---------- laboratories and inventory ----------
const L1 = id("1a000000", 1), L2 = id("1a000000", 2);
await upsert("laboratories", [
  { id: L1, name: "Laboratorium Keperawatan Dasar", location: "Gedung FIKES Lt. 2", capacity: 30, kalab_id: uid.kalab, program_study_id: P_KEP, description: "Praktikum tanda vital dan keterampilan dasar." },
  { id: L2, name: "Laboratorium Gizi & Pangan", location: "Gedung FIKES Lt. 3", capacity: 20, kalab_id: uid.kalab, program_study_id: P_GIZI, description: "Analisis bahan pangan dan pengukuran gizi." },
]);
const C1 = id("1c000000", 1), C2 = id("1c000000", 2);
await upsert("equipment_categories", [
  { id: C1, name: "Alat Ukur" },
  { id: C2, name: "Alat Laboratorium" },
]);

const E = {
  tensi: id("1e000000", 1), termo: id("1e000000", 2), timbang: id("1e000000", 3), stetos: id("1e000000", 4), mikro: id("1e000000", 5),
};
await upsert("equipment", [
  { id: E.tensi, laboratory_id: L1, category_id: C1, code: "ALT-001", name: "Tensimeter digital", qty_total: 3, qty_available: 3, condition: "Baik", requires_calibration: true, description: "Tensimeter digital lengan untuk pengukuran tekanan darah.", photo_url: `${L1}/tensi.png` },
  { id: E.termo, laboratory_id: L1, category_id: C1, code: "ALT-002", name: "Termometer klinis", qty_total: 2, qty_available: 1, condition: "Baik", requires_calibration: true, description: "Termometer klinis digital untuk suhu tubuh." },
  { id: E.timbang, laboratory_id: L1, category_id: C1, code: "ALT-003", name: "Timbangan digital", qty_total: 2, qty_available: 2, condition: "Baik", requires_calibration: true, description: "Timbangan berat badan untuk pengukuran antropometri." },
  { id: E.stetos, laboratory_id: L1, category_id: C2, code: "ALT-004", name: "Stetoskop", qty_total: 4, qty_available: 2, condition: "Baik", requires_calibration: false, description: "Stetoskop dewasa untuk auskultasi." },
  { id: E.mikro, laboratory_id: L1, category_id: C2, code: "ALT-005", name: "Mikroskop", qty_total: 2, qty_available: 2, condition: "Baik", requires_calibration: true, description: "Mikroskop binokuler untuk pengamatan sediaan." },
]);
await upsert("calibrations", [
  { id: id("1f000000", 1), equipment_id: E.tensi, last_calibrated: day(-100), next_calibration: day(200), status: "Valid", updated_by: uid.kalab },
  { id: id("1f000000", 2), equipment_id: E.termo, last_calibrated: day(-355), next_calibration: day(10), status: "Mendekati", updated_by: uid.kalab },
  { id: id("1f000000", 3), equipment_id: E.timbang, last_calibrated: day(-365), next_calibration: day(-5), status: "Kedaluwarsa", updated_by: uid.kalab },
  { id: id("1f000000", 4), equipment_id: E.mikro, last_calibrated: day(-60), next_calibration: day(300), status: "Valid", updated_by: uid.kalab },
]);
const K = { alkohol: id("1b000000", 1), sarung: id("1b000000", 2) };
await upsert("consumables", [
  { id: K.alkohol, laboratory_id: L1, name: "Alkohol 70%", unit: "botol", stock: 18, min_stock: 5, description: "Antiseptik untuk sterilisasi alat." },
  { id: K.sarung, laboratory_id: L1, name: "Sarung tangan nitril", unit: "pasang", stock: 98, min_stock: 20, description: "Sarung tangan sekali pakai ukuran M." },
]);

// ---------- courses and modules ----------
const CR = id("2c000000", 1);
await upsert("courses", [{ id: CR, code: "KEP101", name: "Keperawatan Dasar", program_study_id: P_KEP, semester: 1 }]);
await upsert("lecturer_assignments", [{ id: id("2d000000", 1), course_id: CR, lecturer_id: uid.dosen, academic_year: "2026/2027" }]);

const M1 = id("2e000000", 1), M2 = id("2e000000", 2);
const STEPS = ["pre_test", "materi", "prosedur", "simulasi", "post_test", "self_evaluation"];
await upsert("modules", [
  { id: M1, course_id: CR, lecturer_id: uid.dosen, title: "Pengukuran Tanda Vital", description: "Tekanan darah, nadi, suhu, dan pernapasan.", status: "Published", published_at: ts(-14), published_by: uid.dosen, step_order: STEPS },
  { id: M2, course_id: CR, lecturer_id: uid.dosen, title: "Pengukuran Antropometri", description: "Berat, tinggi, dan lingkar tubuh.", status: "Draft", step_order: STEPS },
]);
await upsert("module_access", [{ id: id("2f000000", 1), module_id: M1, student_id: uid.mahasiswa, granted_at: ts(-14) }]);
await upsert("materials", [
  { id: id("30000000", 1), module_id: M1, title: "Pengantar tanda vital", type: "text", content: "Tanda vital meliputi tekanan darah, nadi, suhu, dan laju pernapasan.", sort_order: 1 },
  { id: id("30000000", 2), module_id: M1, title: "Nilai normal tanda vital", type: "text", content: "Tekanan darah normal sekitar 120/80 mmHg. Nadi dewasa 60–100 kali per menit.", sort_order: 2 },
]);
await upsert("procedures", [
  { id: id("31000000", 1), module_id: M1, step_no: 1, title: "Persiapan alat", instruction: "Siapkan tensimeter, pastikan manset sesuai ukuran lengan." },
  { id: id("31000000", 2), module_id: M1, step_no: 2, title: "Pengukuran tekanan darah", instruction: "Pasang manset, pompa hingga 180 mmHg, lalu catat hasilnya." },
  { id: id("31000000", 3), module_id: M1, step_no: 3, title: "Pencatatan", instruction: "Catat tekanan darah, nadi, dan waktu pengukuran." },
]);
await upsert("simulations", [
  { id: id("32000000", 1), module_id: M1, title: "Video pengukuran tekanan darah", type: "video", external_url: "https://example.com/video-tekanan-darah", config: {} },
]);
await upsert("self_evaluations", [
  { id: id("33000000", 1), module_id: M1, title: "Refleksi praktikum", items: ["Saya memahami cara memasang manset dengan benar.", "Saya dapat membaca hasil tekanan darah dengan tepat.", "Saya mencatat hasil pengukuran secara lengkap."] },
]);

const A_PRE = id("34000000", 1), A_POST = id("34000000", 2);
await upsert("assessments", [
  { id: A_PRE, module_id: M1, title: "Pre-test", type: "pre_test", max_attempt: 2, passing_grade: 60, duration_min: 15 },
  { id: A_POST, module_id: M1, title: "Post-test", type: "post_test", max_attempt: 2, passing_grade: 70, duration_min: 20 },
]);
const Q = { pg1: id("35000000", 1), pgk: id("35000000", 2), bs: id("35000000", 3), pg2: id("35000000", 4), essay: id("35000000", 5) };
await upsert("questions", [
  { id: Q.pg1, assessment_id: A_PRE, question_text: "Nilai normal tekanan darah sistolik orang dewasa adalah?", type: "pg", score: 10, sort_order: 1 },
  { id: Q.pgk, assessment_id: A_PRE, question_text: "Manakah yang termasuk alat pengukuran tanda vital?", type: "pg_kompleks", score: 10, sort_order: 2 },
  { id: Q.bs, assessment_id: A_PRE, question_text: "Denyut nadi normal dewasa berkisar 60–100 kali per menit.", type: "benar_salah", score: 5, sort_order: 3 },
  { id: Q.pg2, assessment_id: A_POST, question_text: "Berapa lama manset dipompa untuk pengukuran standar?", type: "pg", score: 10, sort_order: 1 },
  { id: Q.essay, assessment_id: A_POST, question_text: "Jelaskan langkah pengukuran tekanan darah dengan tensimeter.", type: "esai", score: 20, sort_order: 2 },
]);
const O = (n) => id("36000000", n);
await upsert("question_options", [
  { id: O(1), question_id: Q.pg1, option_text: "Di bawah 90 mmHg", is_correct: false },
  { id: O(2), question_id: Q.pg1, option_text: "120 mmHg", is_correct: true },
  { id: O(3), question_id: Q.pg1, option_text: "160 mmHg", is_correct: false },
  { id: O(4), question_id: Q.pgk, option_text: "Tensimeter", is_correct: true },
  { id: O(5), question_id: Q.pgk, option_text: "Termometer", is_correct: true },
  { id: O(6), question_id: Q.pgk, option_text: "Timbangan", is_correct: false },
  { id: O(7), question_id: Q.pgk, option_text: "Stetoskop", is_correct: true },
  { id: O(8), question_id: Q.bs, option_text: "Benar", is_correct: true },
  { id: O(9), question_id: Q.bs, option_text: "Salah", is_correct: false },
  { id: O(10), question_id: Q.pg2, option_text: "15 detik", is_correct: false },
  { id: O(11), question_id: Q.pg2, option_text: "Hingga 180 mmHg", is_correct: true },
]);

// ---------- learning progress and attempts ----------
await upsert("learning_progress", [
  { id: id("37000000", 1), student_id: uid.mahasiswa, module_id: M1, current_step: "materi", completed_steps: ["pre_test"], percent: 16.67, last_accessed_at: ts(-1) },
]);
const AT_PRE = id("38000000", 1), AT_POST = id("38000000", 2);
await upsert("assessment_attempts", [
  { id: AT_PRE, assessment_id: A_PRE, student_id: uid.mahasiswa, attempt_no: 1, status: "graded", started_at: ts(-3), submitted_at: ts(-3), total_score: 15 },
  { id: AT_POST, assessment_id: A_POST, student_id: uid.mahasiswa, attempt_no: 1, status: "waiting_review", started_at: ts(-1), submitted_at: ts(-1) },
]);
await upsert("answers", [
  { id: id("39000000", 1), attempt_id: AT_PRE, question_id: Q.pg1, selected_options: [O(2)], score: 10 },
  { id: id("39000000", 2), attempt_id: AT_PRE, question_id: Q.pgk, selected_options: [O(4), O(6)], score: 0 },
  { id: id("39000000", 3), attempt_id: AT_PRE, question_id: Q.bs, selected_options: [O(8)], score: 5 },
  { id: id("39000000", 4), attempt_id: AT_POST, question_id: Q.pg2, selected_options: [O(11)], score: 10 },
  { id: id("39000000", 5), attempt_id: AT_POST, question_id: Q.essay, answer_text: "Pasang manset, pompa sampai 180 mmHg, lalu buka perlahan sambil mendengar bunyi Korotkoff.", score: null },
]);
await upsert("self_evaluation_responses", [
  { id: id("3a000000", 1), self_evaluation_id: id("33000000", 1), student_id: uid.mahasiswa, answers: { "0": 4, "1": 3, "2": 5 }, submitted_at: ts(-2) },
]);

// ---------- laboratory requests ----------
const R1 = id("40000000", 1), R2 = id("40000000", 2), R3 = id("40000000", 3);
await upsert("lab_usage_requests", [
  { id: R1, requester_id: uid.mahasiswa, laboratory_id: L1, usage_date: day(7), start_time: "08:00", end_time: "10:00", purpose: "Praktikum tanda vital", status: "Disetujui", approved_by: uid.kalab, approved_at: ts(-1), created_at: ts(-2) },
  { id: R2, requester_id: uid.dosen, laboratory_id: L1, usage_date: day(14), start_time: "13:00", end_time: "15:00", purpose: "Demo praktikum untuk kelas", status: "Diajukan", created_at: ts(-1) },
  { id: R3, requester_id: uid.mahasiswa, laboratory_id: L2, usage_date: day(-2), start_time: "09:00", end_time: "11:00", purpose: "Uji kadar air bahan", status: "Ditolak", rejection_reason: "Jadwal bentrok dengan kegiatan laboratorium", approved_by: uid.kalab, approved_at: ts(-3), created_at: ts(-4) },
]);
await upsert("laboratory_schedule_entries", [
  { id: id("41000000", 1), laboratory_id: L1, lab_usage_request_id: R1, date: day(7), start_time: "08:00", end_time: "10:00", activity: "Praktikum tanda vital", is_locked: true },
]);
await upsert("status_history", [
  { id: id("42000000", 1), lab_usage_request_id: R1, from_status: null, to_status: "Diajukan", changed_by: uid.mahasiswa, changed_at: ts(-2) },
  { id: id("42000000", 2), lab_usage_request_id: R1, from_status: "Diajukan", to_status: "Disetujui", changed_by: uid.kalab, changed_at: ts(-1) },
  { id: id("42000000", 3), lab_usage_request_id: R3, from_status: null, to_status: "Diajukan", changed_by: uid.mahasiswa, changed_at: ts(-4) },
  { id: id("42000000", 4), lab_usage_request_id: R3, from_status: "Diajukan", to_status: "Ditolak", changed_by: uid.kalab, changed_at: ts(-3), note: "Jadwal bentrok dengan kegiatan laboratorium" },
]);

// ---------- borrowings (alat dan bahan) ----------
const B1 = id("50000000", 1), B2 = id("50000000", 2), B3 = id("50000000", 3), B4 = id("50000000", 4), B5 = id("50000000", 5);
await upsert("equipment_borrowings", [
  { id: B1, borrower_id: uid.mahasiswa, laboratory_id: L1, borrow_date: day(-5), return_due_date: day(-2), purpose: "Praktikum tanda vital", status: "Dikonfirmasi", approved_by: uid.kalab, approved_at: ts(-5), is_overdue: false },
  { id: B2, borrower_id: uid.mahasiswa, laboratory_id: L1, borrow_date: day(0), return_due_date: day(3), purpose: "Pengukuran suhu tubuh", status: "Dipinjam", approved_by: uid.kalab, approved_at: ts(-1), is_overdue: false },
  { id: B3, borrower_id: uid.dosen, laboratory_id: L1, borrow_date: day(7), return_due_date: day(8), purpose: "Demo mikroskop", status: "Diajukan", is_overdue: false },
  { id: B4, borrower_id: uid.mahasiswa, laboratory_id: L1, borrow_date: day(-4), return_due_date: day(-1), purpose: "Auskultasi kelompok", status: "Ditunggu", approved_by: uid.kalab, approved_at: ts(-4), is_overdue: true },
  { id: B5, borrower_id: uid.mahasiswa, laboratory_id: L1, borrow_date: day(3), return_due_date: day(4), purpose: "Latihan auskultasi", status: "Ditolak", rejection_reason: "Stetoskop dipesan untuk kegiatan lain", approved_by: uid.kalab, approved_at: ts(-1), is_overdue: false },
]);
const BI = (n) => id("51000000", n);
await upsert("borrowing_items", [
  { id: BI(1), borrowing_id: B1, equipment_id: E.tensi, item_type: "Alat", quantity: 1, must_return: true },
  { id: BI(2), borrowing_id: B1, consumable_id: K.sarung, item_type: "Bahan", quantity: 2, must_return: false },
  { id: BI(3), borrowing_id: B2, equipment_id: E.termo, item_type: "Alat", quantity: 1, must_return: true },
  { id: BI(4), borrowing_id: B2, consumable_id: K.alkohol, item_type: "Bahan", quantity: 2, must_return: false },
  { id: BI(5), borrowing_id: B3, equipment_id: E.mikro, item_type: "Alat", quantity: 1, must_return: true },
  { id: BI(6), borrowing_id: B4, equipment_id: E.stetos, item_type: "Alat", quantity: 2, must_return: true },
  { id: BI(7), borrowing_id: B5, equipment_id: E.stetos, item_type: "Alat", quantity: 1, must_return: true },
]);

// Photos for readiness and return evidence (placeholder PNGs in private buckets).
for (const [bucket, p] of [
  ["equipment-photos", `${L1}/tensi.png`],
  ["readiness-photos", `${B1}/ready.png`],
  ["return-photos", `${B1}/return.png`],
  ["readiness-photos", `${B2}/ready.png`],
  ["readiness-photos", `${B4}/ready.png`],
  ["return-photos", `${B4}/return.png`],
]) {
  await uploadPng(bucket, p);
}
await upsert("borrowing_readiness", [
  { id: id("52000000", 1), borrowing_id: B1, note: "Semua item siap diambil", photo_url: `${B1}/ready.png`, uploaded_by: uid.kalab, uploaded_at: ts(-5) },
  { id: id("52000000", 2), borrowing_id: B2, note: "Termometer dan alkohol sudah disiapkan", photo_url: `${B2}/ready.png`, uploaded_by: uid.kalab, uploaded_at: ts(-1) },
  { id: id("52000000", 3), borrowing_id: B4, note: "Stetoskop dua unit siap", photo_url: `${B4}/ready.png`, uploaded_by: uid.kalab, uploaded_at: ts(-4) },
]);
await upsert("borrowing_return_evidence", [
  { id: id("53000000", 1), borrowing_id: B1, note: "Dikembalikan lengkap", photo_url: `${B1}/return.png`, uploaded_by: uid.mahasiswa, uploaded_at: ts(-2) },
  { id: id("53000000", 2), borrowing_id: B4, note: "Dikembalikan satu unit", photo_url: `${B4}/return.png`, uploaded_by: uid.mahasiswa, uploaded_at: ts(-1) },
]);
await upsert("borrowing_verifications", [
  { id: id("54000000", 1), borrowing_id: B1, result: "Sesuai", discrepancy_note: null, verified_by: uid.kalab, verified_at: ts(-2) },
  { id: id("54000000", 2), borrowing_id: B4, result: "Tidak_Sesuai", discrepancy_note: "Kurang satu stetoskop saat dikembalikan", verified_by: uid.kalab, verified_at: ts(-1) },
]);

// Stock movements: consumables leave the lab when a borrowing is handed over.
await upsert("stock_movements", [
  { id: id("55000000", 1), consumable_id: K.sarung, borrowing_item_id: BI(2), quantity: 2, type: "out", created_by: uid.kalab, created_at: ts(-5) },
  { id: id("55000000", 2), consumable_id: K.alkohol, borrowing_item_id: BI(4), quantity: 2, type: "out", created_by: uid.kalab, created_at: ts(-1) },
]);

// Status history for each borrowing (notifications are created by the database trigger).
const SH = (n) => id("56000000", n);
await upsert("status_history", [
  { id: SH(1), borrowing_id: B1, from_status: null, to_status: "Diajukan", changed_by: uid.mahasiswa, changed_at: ts(-6) },
  { id: SH(2), borrowing_id: B1, from_status: "Diajukan", to_status: "Disetujui", changed_by: uid.kalab, changed_at: ts(-5) },
  { id: SH(3), borrowing_id: B1, from_status: "Disetujui", to_status: "Dipinjam", changed_by: uid.kalab, changed_at: ts(-5), note: "Siap diambil" },
  { id: SH(4), borrowing_id: B1, from_status: "Dipinjam", to_status: "Dikembalikan", changed_by: uid.mahasiswa, changed_at: ts(-2), note: "Dikembalikan lengkap" },
  { id: SH(5), borrowing_id: B1, from_status: "Dikembalikan", to_status: "Dikonfirmasi", changed_by: uid.kalab, changed_at: ts(-2) },
  { id: SH(6), borrowing_id: B2, from_status: null, to_status: "Diajukan", changed_by: uid.mahasiswa, changed_at: ts(-2) },
  { id: SH(7), borrowing_id: B2, from_status: "Diajukan", to_status: "Disetujui", changed_by: uid.kalab, changed_at: ts(-1) },
  { id: SH(8), borrowing_id: B2, from_status: "Disetujui", to_status: "Dipinjam", changed_by: uid.kalab, changed_at: ts(-1), note: "Siap diambil" },
  { id: SH(9), borrowing_id: B4, from_status: null, to_status: "Diajukan", changed_by: uid.mahasiswa, changed_at: ts(-5) },
  { id: SH(10), borrowing_id: B4, from_status: "Diajukan", to_status: "Disetujui", changed_by: uid.kalab, changed_at: ts(-4) },
  { id: SH(11), borrowing_id: B4, from_status: "Disetujui", to_status: "Dipinjam", changed_by: uid.kalab, changed_at: ts(-4) },
  { id: SH(12), borrowing_id: B4, from_status: "Dipinjam", to_status: "Dikembalikan", changed_by: uid.mahasiswa, changed_at: ts(-1) },
  { id: SH(13), borrowing_id: B4, from_status: "Dikembalikan", to_status: "Ditunggu", changed_by: uid.kalab, changed_at: ts(-1), note: "Kurang satu stetoskop" },
  { id: SH(14), borrowing_id: B3, from_status: null, to_status: "Diajukan", changed_by: uid.dosen, changed_at: ts(-1) },
  { id: SH(15), borrowing_id: B5, from_status: null, to_status: "Diajukan", changed_by: uid.mahasiswa, changed_at: ts(-2) },
  { id: SH(16), borrowing_id: B5, from_status: "Diajukan", to_status: "Ditolak", changed_by: uid.kalab, changed_at: ts(-1), note: "Stetoskop dipesan untuk kegiatan lain" },
]);

// Endorsement queue for the Dekan (no Dekan account exists yet, so dean_id stays empty).
await upsert("borrowing_endorsements", [
  { id: id("57000000", 1), request_type: "borrowing", borrowing_id: B1, status: "Disahkan", endorsed_at: ts(-2), note: "Contoh pengesahan" },
  { id: id("57000000", 2), request_type: "borrowing", borrowing_id: B2, status: "Menunggu_Pengesahan", created_at: ts(-1) },
]);

console.log("Dummy data seeded.");
console.log("Akun: dosen", EMAILS.dosen, "| kalab", EMAILS.kalab, "| admin", EMAILS.admin, "| mahasiswa", EMAILS.mahasiswa);
console.log("Alur: lab disetujui/ditolak, peminjaman Diajukan/Disetujui/Dipinjam/Dikonfirmasi/Ditunggu/Ditolak, pre/post-test, progres, self-evaluation, pengesahan Dekan.");
