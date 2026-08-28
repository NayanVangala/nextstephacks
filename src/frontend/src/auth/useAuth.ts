import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { 得供給, 記其所往, 復其所往 } from "../data/供給";

/**
 * 登入之狀。無供給則恆為「不可登入」,非「未登入」—— 二者異。
 *
 * "Cannot sign in" and "not signed in" are different states and the interface
 * must not conflate them. With no backend configured there is no sign-in to
 * offer, so the control is absent rather than present-and-broken.
 */
export type 登入之狀 =
  | { 態: "不可"; }
  | { 態: "未定"; }
  | { 態: "未登入"; }
  | { 態: "已登入"; session: Session };

export function useAuth() {
  const 供 = 得供給();
  const [狀, set狀] = useState<登入之狀>(供 ? { 態: "未定" } : { 態: "不可" });
  const [誤, set誤] = useState<string | null>(null);

  useEffect(() => {
    if (!供) return;
    let 已棄 = false;

    // OAuth 既歸,supabase 已取其 token 而清其 hash,乃復吾之路。
    復其所往();

    供.auth.getSession().then(({ data }) => {
      if (已棄) return;
      set狀(data.session ? { 態: "已登入", session: data.session } : { 態: "未登入" });
    });

    const { data: sub } = 供.auth.onAuthStateChange((_e, session) => {
      if (已棄) return;
      set狀(session ? { 態: "已登入", session } : { 態: "未登入" });
    });

    return () => {
      已棄 = true;
      sub.subscription.unsubscribe();
    };
  }, [供]);

  const 登入 = async (供者: "google" | "github") => {
    if (!供) return;
    set誤(null);
    // 記其所在而後去 —— 歸來之時 hash 已為 supabase 所清。
    記其所往();
    const { error } = await 供.auth.signInWithOAuth({
      provider: 供者,
      options: { redirectTo: `${location.origin}${location.pathname}` },
    });
    if (error) set誤(error.message);
  };

  const 登出 = async () => {
    if (!供) return;
    const { error } = await 供.auth.signOut();
    if (error) set誤(error.message);
  };

  return { 狀, 誤, 登入, 登出, 可登入: 供 !== null };
}
