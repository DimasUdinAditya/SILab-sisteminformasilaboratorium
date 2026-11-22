// Adds a Kaprodi demo account (S1 Keperawatan) to the test project. Test project only.
// Reads the service-role key and DEMO_PASSWORD from .env.local; never prints them.
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
const PASSWORD = env.DEMO_PASSWORD;
if (!PASSWORD) throw new Error("DEMO_PASSWORD belum diisi di .env.local");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function call(method, p, body, extra = {}) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { ...H, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const email = "kaprodi@gmail.com";
const name = "Kaprodi S1 Keperawatan";
const roles = await call("GET", "/rest/v1/roles?select=id,code");
const roleId = Object.fromEntries(roles.map((r) => [r.code, r.id]));
const prodi = (await call("GET", "/rest/v1/program_studies?select=id&code=eq.S1KEP"))[0];
const { users } = await call("GET", "/auth/v1/admin/users?per_page=1000");

let user = users.find((u) => u.email === email);
if (!user) user = await call("POST", "/auth/v1/admin/users", { email, password: PASSWORD, email_confirm: true, user_metadata: { name } });
await call("POST", "/rest/v1/profiles?on_conflict=id",
  [{ id: user.id, email, name, nim_nip: "197505052000031001", role_id: roleId.kaprodi, program_study_id: prodi.id, is_active: true }],
  { Prefer: "resolution=merge-duplicates,return=minimal" });
console.log(`akun kaprodi: ${email} (prodi S1KEP)`);
