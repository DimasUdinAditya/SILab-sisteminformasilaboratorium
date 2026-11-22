// Adds a Dekan and a Wadek 1 demo account to the test project, and links the Dekan to the endorsed borrowing.
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
const PASSWORD = env.DEMO_PASSWORD;
if (!PASSWORD) throw new Error("DEMO_PASSWORD belum diisi di .env.local");
const ACCOUNTS = [
  { email: "dekan@gmail.com", name: "Dekan FIKES", role: "dekan", nip: "196808081994031003" },
  { email: "wadek1@gmail.com", name: "Wakil Dekan 1", role: "wadek1", nip: "197010101995031002" },
];

async function call(method, p, body, extra = {}) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { ...H, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const roles = await call("GET", "/rest/v1/roles?select=id,code");
const roleId = Object.fromEntries(roles.map((r) => [r.code, r.id]));
const { users } = await call("GET", "/auth/v1/admin/users?per_page=1000");

const ids = {};
for (const a of ACCOUNTS) {
  let user = users.find((u) => u.email === a.email);
  if (!user) {
    user = await call("POST", "/auth/v1/admin/users", { email: a.email, password: PASSWORD, email_confirm: true, user_metadata: { name: a.name } });
  }
  ids[a.role] = user.id;
  await call("POST", "/rest/v1/profiles?on_conflict=id", [{ id: user.id, email: a.email, name: a.name, nim_nip: a.nip, role_id: roleId[a.role], is_active: true }],
    { Prefer: "resolution=merge-duplicates,return=minimal" });
  console.log(`akun ${a.role}: ${a.email}`);
}

// The endorsed borrowing (seeded with no Dekan) now points at the demo Dekan.
await call("PATCH", "/rest/v1/borrowing_endorsements?id=eq.57000000-0000-4000-8000-000000000001", { dean_id: ids.dekan }, { Prefer: "return=minimal" });
console.log("Pengesahan yang sudah disahkan kini tertaut ke akun Dekan.");
