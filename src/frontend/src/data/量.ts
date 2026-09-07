/**
 * 量之事 —— 訪者之計,與其許。
 *
 * 二事必分而不可混:
 *   一、無其許,則一字不載,一餅不設。
 *   二、無 VITE_GA_ID,則雖許之亦無所載 —— 如供給之無其憑,不作半成之器。
 *
 * ORDER MATTERS, and getting it backwards is the whole failure mode: the
 * analytics script MUST NOT be injected until consent is stored as "yes".
 * Loading it first and "disabling" it later still sets cookies and still sends
 * the initial page_view, which is precisely what consent is meant to prevent.
 *
 * 此與 ReportForm 之所諾相涉 —— 其文已改,不然則所書者妄。
 * This interacts with what ReportForm promises users; that copy was amended
 * when this shipped, because leaving it would have made it false.
 */

const 同意之鑰 = "passable:consent:v1";

export type 許 = "yes" | "no";

/** 讀其許。未擇者為 null —— 未擇非拒,故其問當再見。 */
export function 讀許(): 許 | null {
  try {
    const v = localStorage.getItem(同意之鑰);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    // 私窗或禁儲者,視同未擇。不可因其不能記而擅載之。
    return null;
  }
}

export function 記許(v: 許): void {
  try {
    localStorage.setItem(同意之鑰, v);
  } catch {
    // 不能記則不能記。其許止於此頁,而不可因此反其意而載之。
  }
}

/** 量之識。闕之則全不載 —— 有banner而無其後者,徒擾人耳。 */
export function 量之識(): string | undefined {
  const id = import.meta.env.VITE_GA_ID;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

/** 其問當見否:有其識,且未擇。 */
export function 當問許(): boolean {
  return Boolean(量之識()) && 讀許() === null;
}

let 已載 = false;

/**
 * 載其量。必許而後可 —— 此函自驗之,不賴呼者。
 *
 * Self-guarding on purpose: a caller that forgets the check is the likeliest
 * way consent gets bypassed, so the guard lives here rather than at each site.
 */
export function 啟量(): void {
  if (已載) return;
  const id = 量之識();
  if (!id || 讀許() !== "yes") return;
  已載 = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?${new URLSearchParams({ id })}`;
  document.head.appendChild(s);

  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer!.push(args);
  };
  w.gtag("js", new Date());
  // anonymize_ip 者,其address截而後存。非可省之飾,乃所諾於privacy之頁者。
  w.gtag("config", id, { anonymize_ip: true });
}
