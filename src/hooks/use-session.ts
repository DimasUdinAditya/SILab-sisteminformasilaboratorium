import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Client-only session flag (null while unknown). */
export function useHasSession() {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHas(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setHas(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return has;
}
