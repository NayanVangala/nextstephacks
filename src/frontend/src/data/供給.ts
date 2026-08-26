import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 得 Supabase 之 client,無 env 則 null。
 *
 * A null client is a FIRST-CLASS state, not an error: routing never depended on
 * the network and still does not. Reports fall back to local-only, the UI says
 * "not synced", and everything else keeps working.
 */
export function 得供給(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
