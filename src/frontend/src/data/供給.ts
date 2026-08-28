import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 得 Supabase 之 client,無 env 則 null。
 *
 * A null client is a FIRST-CLASS state, not an error: routing never depended on
 * the network and still does not. Reports fall back to local-only, sign-in is
 * not offered at all, and everything else keeps working. This is what lets the
 * app be developed, tested and demoed with no backend configured.
 *
 * 一client而已 —— 报事与登入共之。Supabase 之 client 持其 session 与其
 * refresh 之計時,二之則二者相争,其一之登出不为另一所知。
 * ONE client, shared by reports and auth. A Supabase client owns the session and
 * its refresh timer; creating two means two sessions racing, and a sign-out on
 * one that the other never hears about.
 */
let 記: SupabaseClient | null | undefined;

export function 得供給(): SupabaseClient | null {
  if (記 !== undefined) return 記;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    記 = null;
    return 記;
  }
  記 = createClient(url, key, {
    auth: {
      // 登入須存其 session,否則一刷新即失之。
      persistSession: true,
      autoRefreshToken: true,
      // OAuth 歸來,其 token 在 hash 之中。detectSessionInUrl 取之而後去之,
      // 故此app之 hash router 不見其亂。
      // Supabase returns #access_token=... on the OAuth redirect. This consumes
      // it and clears the hash; see 復其所往() for how the intended route is
      // put back afterwards, since clearing the hash also clears our route.
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return 記;
}

/** 有無其服。界面以此定登入之鈕見與不見。 */
export function 有供給(): boolean {
  return 得供給() !== null;
}

const 所往之鑰 = "passable.auth.return";

/**
 * 登入之前,記其所在;既歸,復之。
 *
 * The OAuth round trip destroys the hash, and the hash is where this app keeps
 * the entire route — city, origin, destination, profile, hour. Without this a
 * user who signs in from a planned route comes back to an empty map and has to
 * start over, which is a worse experience than not offering sign-in at all.
 */
export function 記其所往(): void {
  try {
    sessionStorage.setItem(所往之鑰, location.hash);
  } catch {
    // 私密之窗無 sessionStorage。失其所往而已,不害其登入。
  }
}

export function 復其所往(): void {
  try {
    const h = sessionStorage.getItem(所往之鑰);
    sessionStorage.removeItem(所往之鑰);
    // 既歸而 hash 已為 supabase 所清,乃復之。今之 hash 若已有路,則不奪之。
    if (h && h.startsWith("#/") && !location.hash.startsWith("#/")) {
      location.hash = h;
    }
  } catch {
    // 同上。
  }
}
