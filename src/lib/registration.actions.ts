"use server";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/integrations/supabase/admin";

const input = z.object({ nim_nip: z.string().trim().min(1).max(40) });

/**
 * Public pre-check for the Sign Up form. The sign-up trigger rejects a NIM/NIP
 * that already belongs to a profile, but the auth service hides that database
 * message, so the form asks first. Returns only a yes/no — never profile data.
 */
export async function checkNimNipTaken(raw: unknown) {
  const data = input.parse(raw);
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("nim_nip", data.nim_nip);
  if (error) throw new Error("Gagal memeriksa NIM/NIP.");
  return { taken: (count ?? 0) > 0 };
}
