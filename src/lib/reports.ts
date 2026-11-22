import { escapeHtml as e, longDate, longDateJakarta } from "@/lib/letter-template";
import { ACTIVE_BORROWING, pct, sum, type Counts, type LabOps, type LeadershipSummary, type Period } from "@/lib/summary";

const row = (cells: (string | number)[], header = false) =>
  `<tr>${cells.map((c) => (header ? `<th>${e(String(c))}</th>` : `<td>${e(String(c))}</td>`)).join("")}</tr>`;

const counts = (c: Counts) => (Object.keys(c).length ? Object.entries(c).map(([k, v]) => `${k} ${v}`).join(", ") : "-");

export function periodLabel(p: Period) {
  if (!p.from && !p.to) return "Semua waktu";
  return `${p.from ? longDate(p.from) : "awal"} s.d. ${p.to ? longDate(p.to) : "sekarang"}`;
}

function header(title: string, scope: string, p: Period, by: string) {
  return `<h2 style="text-align:center">FAKULTAS ILMU KESEHATAN</h2>
<p style="text-align:center">SiLab — Sistem Informasi Laboratorium</p><hr/>
<h3 style="text-align:center">${e(title)}</h3>
<table>${row(["Cakupan", scope])}${row(["Periode", periodLabel(p)])}${row(["Dibuat oleh", by])}${row(["Tanggal cetak", longDateJakarta(new Date())])}</table>`;
}

export function leadershipReportHtml(s: LeadershipSummary, p: Period, by: string, scope: string) {
  const t = s.totals;
  const avg = (v: number | null, n: number) => (v != null ? String(v) : n > 0 ? "<3 data" : "-");
  let html = header("LAPORAN MONITORING PEMBELAJARAN & LABORATORIUM", scope, p, by);
  html += `<h3>Ringkasan</h3><table>
${row(["Mahasiswa aktif", t.students])}
${row(["Modul terbit", `${t.modules_published} dari ${t.modules_total}`])}
${row(["Rata-rata progres belajar", t.avg_progress != null ? `${t.avg_progress}%` : "-"])}
${row(["Penyelesaian modul", `${t.completed} dari ${t.accessed} (${pct(t.completed, t.accessed)}%)`])}
${row(["Rata-rata pre-test / post-test", `${avg(t.pretest_avg, t.pretest_n)} / ${avg(t.posttest_avg, t.posttest_n)}`])}
${row(["Pengajuan lab", `${sum(t.lab_requests)} (${counts(t.lab_requests)})`])}
${row(["Peminjaman alat & bahan", `${sum(t.borrowings)} (${counts(t.borrowings)})`])}
${row(["Peminjaman terlambat", t.overdue])}
</table>`;
  if (s.endorsements) {
    const en = s.endorsements;
    html += `<h3>Pengesahan Dekan</h3><table>
${row(["Menunggu pengesahan", en.pending])}
${row(["Disahkan pada periode", en.endorsed_in_period])}
${row(["Rata-rata waktu pengesahan", en.avg_days != null ? `${en.avg_days} hari` : "-"])}
</table>`;
  }
  html += `<h3>Rincian per program studi</h3><table>${row(["Prodi", "Mhs", "Modul", "Progres", "Post-test", "Lab", "Pinjam"], true)}`;
  for (const r of s.prodi)
    html += row([r.code ?? "", r.students, `${r.modules_published}/${r.modules_total}`, r.avg_progress != null ? `${r.avg_progress}%` : "-", avg(r.posttest_avg, r.posttest_n), sum(r.lab_requests), sum(r.borrowings)]);
  html += `</table><p>Catatan: laporan ini hanya berisi data agregat, tanpa nama mahasiswa dan nilai individual. Rata-rata nilai ditampilkan bila ada minimal 3 nilai.</p>`;
  return html;
}

export function labReportHtml(labs: LabOps[], p: Period, by: string) {
  let html = header("LAPORAN OPERASIONAL LABORATORIUM", labs.map((l) => l.name).join(", ") || "-", p, by);
  for (const l of labs) {
    html += `<h3>${e(l.name)}</h3><table>
${row(["Pengajuan penggunaan lab", `${sum(l.lab_requests)} (${counts(l.lab_requests)})`])}
${row(["Sesi lab terjadwal", l.sessions])}
${row(["Peminjaman alat & bahan", `${sum(l.borrowings)} (${counts(l.borrowings)})`])}
${row(["Peminjaman berjalan", sum(l.borrowings, ACTIVE_BORROWING)])}
${row(["Peminjaman terlambat", l.overdue])}
${row(["Alat", `${l.equipment_types} jenis, ${l.equipment_available} dari ${l.equipment_units} unit tersedia`])}
${row(["Status kalibrasi", counts(l.calibration)])}
${row(["Bahan habis pakai", `${l.consumables} jenis`])}
</table>`;
    if (l.top_items.length) {
      html += `<p><b>Item paling sering dipinjam</b></p><table>${row(["Item", "Jenis", "Jumlah"], true)}`;
      for (const i of l.top_items) html += row([i.name, i.type, i.qty]);
      html += `</table>`;
    }
    if (l.low_stock.length) {
      html += `<p><b>Stok bahan menipis</b></p><table>${row(["Bahan", "Stok", "Minimum"], true)}`;
      for (const s of l.low_stock) html += row([s.name, `${s.stock} ${s.unit}`, `${s.min} ${s.unit}`]);
      html += `</table>`;
    }
  }
  return html;
}
