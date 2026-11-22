import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const APP_ROLES: readonly AppRole[] = [
  "mahasiswa",
  "dosen",
  "kalab",
  "kaprodi",
  "wadek1",
  "dekan",
  "super_admin",
] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  mahasiswa: "Mahasiswa",
  dosen: "Dosen",
  kalab: "Kepala Laboratorium",
  kaprodi: "Ketua Program Studi",
  wadek1: "Wakil Dekan 1",
  dekan: "Dekan",
  super_admin: "Super Admin",
};

/** Roles whose account must belong to a program study. */
export const ROLES_REQUIRING_PRODI: readonly AppRole[] = ["mahasiswa", "dosen", "kaprodi"];

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

/** Roles a visitor may request on the public Sign Up form (never Super Admin). */
export const SELF_SIGNUP_ROLES: readonly AppRole[] = APP_ROLES.filter((r) => r !== "super_admin");

/** Label for the identity number field: students have a NIM, staff a NIP. */
export function nimNipLabel(role: AppRole | string | null | undefined) {
  return role === "mahasiswa" ? "NIM" : "NIP";
}
