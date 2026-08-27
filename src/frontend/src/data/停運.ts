import type { CityPack } from "../types";

export interface 停運之資 {
  總: number;
  路: Record<string, number>;
  更新於: string | null;
}

/** 逾一時辰則謂之陳。 */
export const 陳之限之毫秒 = 60 * 60 * 1000;

/**
 * 解無時區之文,以 agency 之地時為準。
 *
 * GTFS feeds publish agency-local time with no offset. Appending "Z" would read
 * 11:00 Pacific as 11:00 UTC and overstate the age by 7-8 hours — safe in
 * direction but simply wrong. Derives the offset from the zone at that instant,
 * so DST is handled without a date library.
 */
export function 解地時(文: string, 時區 = "America/Los_Angeles"): number {
  const 約 = Date.parse(文.replace(" ", "T") + "Z");
  if (Number.isNaN(約)) return NaN;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: 時區, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const p: Record<string, string> = {};
    for (const x of fmt.formatToParts(new Date(約))) {
      if (x.type !== "literal") p[x.type] = x.value;
    }
    // 以該時區之壁上時反推其偏移,夏令自在其中。
    const 壁 = Date.UTC(
      Number(p.year), Number(p.month) - 1, Number(p.day),
      Number(p.hour) % 24, Number(p.minute), Number(p.second),
    );
    return 約 + (約 - 壁);
  } catch {
    return 約; // Intl 不備則退為 UTC,其誤偏於「陳」,尚安
  }
}

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
export function 停運之狀(
  pack: CityPack,
  今 = Date.now(),
  時區 = "America/Los_Angeles",
) {
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
  // 其自稱之時 —— 非吾取之時。且以 agency 之地時解之。
  const t = 更新於 ? 解地時(更新於, 時區) : NaN;
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
