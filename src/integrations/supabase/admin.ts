import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

// New-style keys (sb_secret_..., sb_publishable_...) are opaque, not JWTs.
// Sending one as "Authorization: Bearer" makes PostgREST treat the request as anon, so drop that header.
function keyFetch(key: string): typeof fetch {
  const isNewKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

// Service-role client. Bypasses RLS. Use only in server actions for trusted admin work.
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    global: { fetch: keyFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
