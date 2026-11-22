"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/auth.server";
import { createSupabaseAdminClient } from "@/integrations/supabase/admin";
import type { Database } from "@/integrations/supabase/types";
import { APP_ROLES, ROLES_REQUIRING_PRODI, type AppRole } from "@/lib/roles";
import { checkImportRows, parseSemester, validateUserRow, type RowFailure, type UserRow } from "@/lib/user-import";

type Client = SupabaseClient<Database>;

async function assertSuperAdmin(supabase: Client) {
  const { data, error } = await supabase.rpc("current_app_role");
  if (error || data !== "super_admin") throw new Error("Akses ditolak: khusus Super Admin.");
}

async function loadLookups(admin: Client) {
  const [{ data: roles }, { data: prodis }, { data: profiles }] = await Promise.all([
    admin.from("roles").select("id, code"),
    admin.from("program_studies").select("id, code"),
    admin.from("profiles").select("email"),
  ]);
  return {
    roleId: new Map((roles ?? []).map((r) => [r.code as string, r.id])),
    prodiId: new Map((prodis ?? []).map((p) => [p.code.toUpperCase(), p.id])),
    emails: new Set((profiles ?? []).map((p) => p.email.toLowerCase())),
  };
}

async function createAccount(
  admin: Client,
  row: UserRow,
  password: string,
  lookups: Awaited<ReturnType<typeof loadLookups>>,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  // Never send `signup_source` here: accounts made by Super Admin skip the
  // self-registration queue and get their profile directly below.
  const { data, error } = await admin.auth.admin.createUser({
    email: row.email,
    password,
    email_confirm: true,
    user_metadata: { name: row.name },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "Gagal membuat akun";
    return { ok: false, reason: /already|registered|exists/i.test(msg) ? "Email sudah terdaftar" : msg };
  }
  const { error: pErr } = await admin.from("profiles").insert({
    id: data.user.id,
    name: row.name,
    email: row.email,
    nim_nip: row.nim_nip || null,
    role_id: lookups.roleId.get(row.role)!,
    program_study_id: row.prodi_code ? (lookups.prodiId.get(row.prodi_code) ?? null) : null,
    semester: row.role === "mahasiswa" ? parseSemester(row.semester) : null,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, reason: pErr.message };
  }
  return { ok: true, id: data.user.id };
}

const passwordSchema = z.string().min(8, "Password minimal 8 karakter").max(72);

const createUserInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(APP_ROLES as [string, ...string[]]),
  nim_nip: z.string().trim().max(40).default(""),
  prodi_code: z.string().trim().toUpperCase().max(20).default(""),
  semester: z.string().trim().max(2).default(""),
  password: passwordSchema,
});

export async function createUser(input: unknown) {
  const data = createUserInput.parse(input);
  const { supabase } = await requireUser();
  await assertSuperAdmin(supabase);
  const admin = createSupabaseAdminClient();
  const lookups = await loadLookups(admin);
  const { password, ...row } = data;
  const invalid = validateUserRow(row, new Set(lookups.prodiId.keys()));
  if (invalid) throw new Error(invalid);
  if (lookups.emails.has(row.email)) throw new Error("Email sudah terdaftar");
  const res = await createAccount(admin, row, password, lookups);
  if (!res.ok) throw new Error(res.reason);
  return { id: res.id };
}

const importUsersInput = z.object({
  password: passwordSchema,
  rows: z
    .array(
      z.object({
        name: z.string().max(120),
        email: z.string().max(255),
        role: z.string().max(40),
        nim_nip: z.string().max(40),
        prodi_code: z.string().max(20),
        semester: z.string().max(2).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export async function importUsers(input: unknown) {
  const data = importUsersInput.parse(input);
  const { supabase } = await requireUser();
  await assertSuperAdmin(supabase);
  const admin = createSupabaseAdminClient();
  const lookups = await loadLookups(admin);
  const { valid, failed } = checkImportRows(data.rows, new Set(lookups.prodiId.keys()), lookups.emails);
  const failures: RowFailure[] = [...failed];
  let success = 0;
  for (const { line, row } of valid) {
    const res = await createAccount(admin, row, data.password, lookups);
    if (res.ok) success++;
    else failures.push({ line, email: row.email, reason: res.reason });
  }
  failures.sort((a, b) => a.line - b.line);
  return { success, failed: failures.length, failures };
}

const setUserActiveInput = z.object({ userId: z.string().uuid(), active: z.boolean() });

export async function setUserActive(input: unknown) {
  const data = setUserActiveInput.parse(input);
  const { supabase, userId } = await requireUser();
  await assertSuperAdmin(supabase);
  if (data.userId === userId && !data.active) throw new Error("Anda tidak dapat menonaktifkan akun sendiri.");
  const admin = createSupabaseAdminClient();
  const { error: banErr } = await admin.auth.admin.updateUserById(data.userId, {
    ban_duration: data.active ? "none" : "876000h",
  });
  if (banErr) throw new Error(banErr.message);
  // Runs as the Super Admin so the audit trail records the actor.
  const { error } = await supabase.rpc("set_profile_active", { _id: data.userId, _active: data.active });
  if (error) throw new Error(error.message);
  return { ok: true };
}

const updateUserInput = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  nim_nip: z.string().trim().max(40),
  role: z.enum(APP_ROLES as [string, ...string[]]),
  program_study_id: z.string().uuid().nullable(),
  semester: z.number().int().min(1).max(14).nullable(),
});

/** Super Admin edits a user's name, NIM/NIP, role, programme and semester. Status changes stay in setUserActive. */
export async function updateUser(input: unknown) {
  const data = updateUserInput.parse(input);
  const { supabase, userId: actorId } = await requireUser();
  await assertSuperAdmin(supabase);
  if (data.userId === actorId && data.role !== "super_admin") {
    throw new Error("Anda tidak dapat mengubah role akun sendiri.");
  }
  const role = data.role as AppRole;
  if (ROLES_REQUIRING_PRODI.includes(role) && !data.program_study_id) {
    throw new Error("Program studi wajib untuk role ini.");
  }
  const admin = createSupabaseAdminClient();

  const { data: before, error: readErr } = await admin
    .from("profiles")
    .select("name, nim_nip, role_id, program_study_id, semester, roles(code)")
    .eq("id", data.userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!before) throw new Error("Pengguna tidak ditemukan.");

  if (data.nim_nip) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("nim_nip", data.nim_nip)
      .neq("id", data.userId);
    if ((count ?? 0) > 0) throw new Error("NIM/NIP sudah dipakai pengguna lain.");
  }

  const { data: roleRow } = await admin.from("roles").select("id").eq("code", role).maybeSingle();
  if (!roleRow) throw new Error("Role tidak dikenal.");

  const next = {
    name: data.name,
    nim_nip: data.nim_nip || null,
    role_id: roleRow.id,
    program_study_id: ROLES_REQUIRING_PRODI.includes(role) || data.program_study_id ? data.program_study_id : null,
    semester: role === "mahasiswa" ? data.semester : null,
  };
  const { error } = await admin.from("profiles").update(next).eq("id", data.userId);
  if (error) throw new Error(error.message);

  await admin.rpc("audit_write", {
    _action: "account.update",
    _entity: "profiles",
    _id: data.userId,
    _old: { name: before.name, nim_nip: before.nim_nip, role: before.roles?.code, program_study_id: before.program_study_id, semester: before.semester },
    _new: { name: next.name, nim_nip: next.nim_nip, role, program_study_id: next.program_study_id, semester: next.semester },
    _actor: actorId,
  });
  return { ok: true };
}
