/**
 * 官之警。取於 National Weather Service。
 *
 * This is the honest version of "watch the news for heat danger". Scraping news
 * sites from a browser is impossible (CORS) and would be unsafe here even if it
 * were possible: this tool decides whether someone with MS, a cardiac condition
 * or heat-reactive medication attempts a trip, and adjusting that decision from
 * unattributed parsed prose is exactly the kind of confident wrongness the rest
 * of this project refuses.
 *
 * api.weather.gov is authoritative, free, needs no key, and sends
 * `access-control-allow-origin: *`, so the browser can call it directly with no
 * server. Every alert carries its issuing office, onset, expiry and text, so
 * anything it changes about a route can be shown with its provenance attached.
 *
 * 其效必明言之。警既改其路,而人不知其所以改,則不如不改。
 * Whatever an alert changes, the interface must say so. A route that silently
 * shifts under you is worse than one that does not shift at all.
 */

type 取者 = (url: string) => Promise<Response>;

/** 與暑相關者。餘警(洪、風、火)不入其算 —— 此物但論暑。 */
const 暑之事 = [
  "Extreme Heat Warning",
  "Excessive Heat Warning",
  "Extreme Heat Watch",
  "Excessive Heat Watch",
  "Heat Advisory",
] as const;

export interface 一警 {
  event: string;
  severity: string;
  /** 發之者。「NWS Los Angeles/Oxnard CA」之類。 */
  sender: string;
  headline: string | null;
  instruction: string | null;
  onset: string | null;
  expires: string | null;
}

export interface 警之狀 {
  /** 所取者。null 者未取或取之不得 —— 非「無警」。 */
  警: 一警[] | null;
  /** 取之不得之故。有此則界面當明告,不可默然作無警論。 */
  誤: string | null;
  取於: string | null;
}

export const 無警之狀: 警之狀 = { 警: null, 誤: null, 取於: null };

/**
 * 警之重,化為暑之底。
 *
 * A warning does not merely mean "it is hot" — the raw temperature already says
 * that. It means the combination of heat, humidity, duration and overnight lows
 * is dangerous in a way an instantaneous reading does not capture. So it acts as
 * a FLOOR on modelled heat severity, never a ceiling: if the thermometer already
 * says worse, the thermometer wins.
 *
 * 底而非蓋。若溫已逾之,則從其溫。
 */
export function 暑之底(警: 一警[] | null): number {
  if (!警 || 警.length === 0) return 0;
  let 底 = 0;
  for (const a of 警) {
    const e = a.event.toLowerCase();
    if (e.includes("extreme heat warning") || e.includes("excessive heat warning")) {
      底 = Math.max(底, 0.85);
    } else if (e.includes("watch")) {
      底 = Math.max(底, 0.6);
    } else if (e.includes("advisory")) {
      底 = Math.max(底, 0.5);
    }
  }
  return 底;
}

/**
 * 警之下,所慎者當更慎。曝米之限,乘此而減。
 *
 * Under an active warning the reach budget shrinks. This is the conservative
 * direction: a smaller budget means fewer destinations are reported reachable,
 * never more. An alert can never make the tool claim you can get somewhere it
 * would otherwise have said you could not.
 */
export function 限之減(警: 一警[] | null): number {
  const 底 = 暑之底(警);
  if (底 >= 0.85) return 0.6;
  if (底 >= 0.6) return 0.75;
  if (底 >= 0.5) return 0.85;
  return 1;
}

/** 其警尚在否。過期者不當施於今日之路。 */
function 猶在(a: 一警, 今: number): boolean {
  if (!a.expires) return true;
  const t = Date.parse(a.expires);
  return Number.isNaN(t) ? true : t > 今;
}

/**
 * 取一地之暑警。
 *
 * Failure returns 誤 set and 警 null — NOT an empty array. "We could not ask"
 * and "we asked and there is nothing" are different states, and rendering the
 * first as the second would quietly tell a heat-sensitive user that the coast is
 * clear on a day nobody checked.
 */
export async function 取警(
  lat: number,
  lon: number,
  fetchFn: 取者 = (u) => fetch(u),
  今 = Date.now(),
): Promise<警之狀> {
  const url =
    `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
  try {
    const res = await fetchFn(url);
    if (!res.ok) return { 警: null, 誤: `NWS returned ${res.status}`, 取於: null };
    const d = await res.json();
    const 出: 一警[] = [];
    for (const f of d?.features ?? []) {
      const p = f?.properties;
      if (!p || typeof p.event !== "string") continue;
      if (!暑之事.some((x) => p.event.toLowerCase().includes(x.toLowerCase()))) continue;
      const a: 一警 = {
        event: p.event,
        severity: typeof p.severity === "string" ? p.severity : "Unknown",
        sender: typeof p.senderName === "string" ? p.senderName : "NWS",
        headline: typeof p.headline === "string" ? p.headline : null,
        instruction: typeof p.instruction === "string" ? p.instruction : null,
        onset: typeof p.onset === "string" ? p.onset : null,
        expires: typeof p.expires === "string" ? p.expires : null,
      };
      if (猶在(a, 今)) 出.push(a);
    }
    return { 警: 出, 誤: null, 取於: new Date(今).toISOString() };
  } catch (e) {
    // 網斷、CORS、非 JSON,皆歸於此。回 null 而非空列。
    return {
      警: null,
      誤: e instanceof Error ? e.message : String(e),
      取於: null,
    };
  }
}
