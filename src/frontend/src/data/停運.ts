import type { CityPack } from "../types";

export interface 停運之資 {
  總: number;
  路: Record<string, number>;
  更新於: string | null;
}

/** 逾一時辰則謂之陳。 */
export const 陳之限之毫秒 = 60 * 60 * 1000;

/**
 * 停運之狀,並判其陳否。
 *
 * TWO timestamps exist and they are not interchangeable: when WE fetched, and
 * when the FEED says its data was current. Freshness is judged on the feed's
 * own timestamp. LA Metro's endpoint answers 200 with well-formed JSON whose
 * `last_updated` reads 2022 — a fetch performed one second ago tells you
 * nothing about whether the numbers describe today.
 *
 * Unknown or unparseable freshness counts as STALE, never fresh.
 */
export function 停運之狀(pack: CityPack, 今 = Date.now()) {
  const p = pack as unknown as {
    canceled_service?: 停運之資;
    canceled_service_fetched_at?: string | null;
  };
  const 資 = p.canceled_service;
  const 取於 = p.canceled_service_fetched_at ?? null;

  if (!資 || typeof 資.總 !== "number") {
    return {
      總: 0, 路: {} as Record<string, number>, 最甚: [] as { 路: string; 數: number }[],
      取於, 更新於: null as string | null, 陳否: true, 陳幾時: Infinity, 有源: false,
    };
  }

  const 最甚 = Object.entries(資.路 ?? {})
    .map(([路, 數]) => ({ 路, 數 }))
    .sort((a, b) => b.數 - a.數);

  const 更新於 = 資.更新於 ?? null;
  // 其自稱之時 —— 非吾取之時。
  const t = 更新於 ? Date.parse(更新於.replace(" ", "T") + "Z") : NaN;
  const 陳幾時 = Number.isNaN(t) ? Infinity : 今 - t;

  return {
    總: 資.總,
    路: 資.路 ?? {},
    最甚,
    取於,
    更新於,
    陳否: 陳幾時 > 陳之限之毫秒,
    陳幾時,
    有源: true,
  };
}

type 取者 = (url: string) => Promise<Response>;

/**
 * 試取運行時之停運。此端 CORS 已開,故瀏覽器可直取。
 * 敗則回 null,而呼者歸於建時之快照。
 */
export async function 取實時停運(
  url: string,
  fetchFn: 取者 = (u) => fetch(u),
): Promise<停運之資 | null> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const d = await res.json();
    const 原路 = d?.canceled_trips_summary;
    const 路: Record<string, number> = {};
    if (原路 && typeof 原路 === "object") {
      for (const [k, v] of Object.entries(原路)) {
        if (typeof v === "number" && Number.isInteger(v)) 路[k] = v;
      }
    }
    const 總 = typeof d?.total_canceled_trips === "number"
      ? d.total_canceled_trips
      : Object.values(路).reduce((s, n) => s + n, 0);
    const 更新於 = typeof d?.last_updated === "string" && d.last_updated.trim()
      ? d.last_updated
      : null;
    return { 總, 路, 更新於 };
  } catch {
    return null; // 網斷、CORS、非 JSON,皆歸於此
  }
}
