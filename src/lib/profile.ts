import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";

export type Me = {
  id: string;
  name: string;
  email: string;
  nim_nip: string | null;
  semester: number | null;
  is_active: boolean;
  role: AppRole;
  roleName: string;
  prodi: { id: string; code: string; name: string } | null;
};

export async function fetchMe(): Promise<Me | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, nim_nip, semester, is_active, roles(code, name), program_studies(id, code, name)")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.roles) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    nim_nip: data.nim_nip,
    semester: data.semester,
    is_active: data.is_active,
    role: data.roles.code,
    roleName: data.roles.name,
    prodi: data.program_studies,
  };
}

export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: fetchMe,
  staleTime: 5 * 60_000,
});

/**
 * Where a signed-in login stands: "active" (profile + active), "inactive"
 * (profile switched off by Super Admin) or "pending" (no profile yet — the
 * account is still in, or was rejected from, the registration queue).
 */
export type AccountStatus = "active" | "inactive" | "pending" | "signed_out";

export async function fetchAccountStatus(): Promise<AccountStatus> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "signed_out";
  const { data, error } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return "pending";
  return data.is_active ? "active" : "inactive";
}

export const INACTIVE_MESSAGE = "Akun dinonaktifkan. Hubungi Super Admin.";
