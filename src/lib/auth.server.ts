import "server-only";

import { createSupabaseServerClient } from "@/integrations/supabase/server";

// Returns the signed-in user's cookie-bound client (RLS applies). Throws when logged out.
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized: silakan masuk terlebih dahulu.");
  return { supabase, userId: data.user.id };
}
