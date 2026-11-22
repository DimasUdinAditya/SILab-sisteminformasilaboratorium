// Adds dummy letter templates and a KaLab signature to the test project, so official letters can be issued.
// Test project only. Reads the service-role key from .env.local; never prints it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function call(method, p, body, extra = {}) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { ...H, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const TEMPLATE_BODY = (title) => `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<p style="text-align:center;margin:0"><strong>FAKULTAS ILMU KESEHATAN — UPN VETERAN JAKARTA</strong></p>
<p style="text-align:center;margin:0">Laboratorium FIKES · SiLab</p>
<hr>
<h2 style="text-align:center">${title}</h2>
<p style="text-align:center">Nomor: {{nomor_surat}}</p>
<p>Yang bertanda tangan di bawah ini Kepala Laboratorium menyetujui permohonan dari:</p>
<table>
  <tr><td>Nama</td><td>: {{nama_pemohon}}</td></tr>
  <tr><td>NIM/NIP</td><td>: {{nim_nip}}</td></tr>
  <tr><td>Jenis pengajuan</td><td>: {{jenis_pengajuan}}</td></tr>
  <tr><td>Laboratorium</td><td>: {{laboratorium}}</td></tr>
  <tr><td>Tujuan</td><td>: {{tujuan}}</td></tr>
  <tr><td>Tanggal</td><td>: {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: {{waktu}}</td></tr>
</table>
<p><strong>Daftar item:</strong></p>
{{daftar_item}}
<table style="margin-top:32px">
  <tr>
    <td style="width:50%;text-align:center">Mengetahui,<br>Dekan<br><br><br>……………………</td>
    <td style="width:50%;text-align:center">Jakarta, {{tanggal_persetujuan}}<br>Menyetujui,<br>Kepala Laboratorium<br>{{tanda_tangan}}<br><strong>{{nama_kalab}}</strong></td>
  </tr>
</table>
</body></html>`;

const templates = [
  { id: "7d000000-0000-4000-8000-000000000001", request_type: "lab_usage", name: "Surat Penggunaan Laboratorium", version: 1, is_active: true, template_html: TEMPLATE_BODY("SURAT PERSETUJUAN PENGGUNAAN LABORATORIUM") },
  { id: "7d000000-0000-4000-8000-000000000002", request_type: "borrowing", name: "Surat Peminjaman Alat & Bahan", version: 1, is_active: true, template_html: TEMPLATE_BODY("SURAT PERSETUJUAN PEMINJAMAN ALAT & BAHAN") },
];
for (const t of templates) {
  await call("POST", "/rest/v1/document_templates?on_conflict=id", [t], { Prefer: "resolution=merge-duplicates,return=minimal" });
}
console.log("template surat: 2 (lab_usage, borrowing)");

// KaLab signature: placeholder PNG in the private 'signatures' bucket, path "<kalab_id>/<file>".
const kalab = (await call("GET", "/rest/v1/profiles?select=id&email=eq.aliya@gmail.com"))[0];
const sigPath = `${kalab.id}/ttd-dummy.png`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const up = await fetch(`${BASE}/storage/v1/object/signatures/${sigPath}`, {
  method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "image/png", "x-upsert": "true" }, body: png,
});
if (!up.ok) throw new Error(`upload signature -> ${up.status}: ${await up.text()}`);
await call("PATCH", `/rest/v1/kalab_signatures?kalab_id=eq.${kalab.id}&is_active=eq.true`, { is_active: false }, { Prefer: "return=minimal" });
await call("POST", "/rest/v1/kalab_signatures", [{ id: "7e000000-0000-4000-8000-000000000001", kalab_id: kalab.id, signature_file: sigPath, method: "image", is_active: true }],
  { Prefer: "resolution=merge-duplicates,return=minimal" });
console.log("tanda tangan KaLab: aktif");
