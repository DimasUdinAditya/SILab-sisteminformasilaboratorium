"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";

// Browser client. Only the public URL and publishable key are used here.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
