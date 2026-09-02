import type { CityPack } from "../types";

/**
 * 以名求地。
 *
 * 前此擇地者但十數之選 —— 皆囊中所載之公所、館、蔭處而已。人欲往一街一號,
 * 則無所措手,惟自點其圖。今許其書之。
 *
 * ── 何以取 Nominatim,不取 Google ────────────────────────────────────
 * Google Places 須鑰,而鑰必在其頁 —— 頁之鑰,即公之鑰,人得而用之,其費歸我。
 * 且此物於其首自言「No API keys」「No account」,一鑰入則其言為妄。
 * Nominatim 為 OpenStreetMap 之官,無鑰,無帳,許其跨域,而其資即此囊之所自出 ——
 * 求之與囊同源,則其所得必在其網之中,不至指一不可行之處。
 *
 * Google Places would need a key shipped in client JavaScript, where it is
 * public by construction and billable to us by anyone who reads it. The product
 * also states "No API keys" and "No account" on its own front page. Nominatim
 * needs neither, allows CORS, and — decisively — geocodes against the same
 * OpenStreetMap data the sidewalk graph was extracted from, so a hit is far
 * more likely to sit on a street the router actually knows.
 *
 * ── 其約 ────────────────────────────────────────────────────────────
 * Nominatim's usage policy caps automated clients at one request per second.
 * This is why 求地 is debounced by its caller and why every in-flight request
 * is aborted when the query changes — a keystroke must not become a request.
 */

const 之址 = "https://nominatim.openstreetmap.org/search";

export interface 地之候 {
  /** 所示之名。已略其國,其州 —— 一城之內,不須言其國。 */
  label: string;
  lon: number;
  lat: number;
}

/**
 * Nominatim 之 viewbox 為 左,上,右,下 —— 即 minLon,maxLat,maxLon,minLat。
 * 而囊之 bbox 為 minLon,minLat,maxLon,maxLat。二者之序不同,不可直授。
 *
 * MUST reorder: the pack's bbox is [minLon, minLat, maxLon, maxLat] but
 * Nominatim's viewbox is left,top,right,bottom = minLon,maxLat,maxLon,minLat.
 * Passing the pack's order silently yields an inverted box and no results.
 */
function 界之文(bbox: CityPack["manifest"]["bbox"]): string {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return `${minLon},${maxLat},${maxLon},${minLat}`;
}

/** 其名多綴國州郵號,於一城之內為贅。取其首三節。 */
function 略其名(s: string): string {
  return s.split(",").slice(0, 3).join(",").trim();
}

export function 求地之址(q: string, bbox: CityPack["manifest"]["bbox"]): string {
  const p = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "6",
    // bounded=1 則其求不出此界 —— 出界之地,此器不能行,示之為欺。
    // Results outside the extract cannot be routed to, so returning them would
    // be offering a destination the tool then refuses.
    viewbox: 界之文(bbox),
    bounded: "1",
  });
  return `${之址}?${p.toString()}`;
}

/** 解其所答。凡形不合者棄之,不擲 —— 一行之壞,不當廢其餘。 */
export function 解地(json: unknown): 地之候[] {
  if (!Array.isArray(json)) return [];
  const out: 地之候[] = [];
  for (const r of json) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const lon = Number(o.lon);
    const lat = Number(o.lat);
    const name = typeof o.display_name === "string" ? o.display_name : "";
    if (!name || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    out.push({ label: 略其名(name), lon, lat });
  }
  return out;
}

/**
 * 求之。signal 者,所以廢其前求也。
 * 敗則擲,呼者告之 —— 默然而歸於空,則人以為無此地,實未嘗問也。
 */
export async function 求地(
  q: string,
  bbox: CityPack["manifest"]["bbox"],
  signal?: AbortSignal,
): Promise<地之候[]> {
  const res = await fetch(求地之址(q, bbox), { signal });
  if (!res.ok) throw new Error(`地名之求不應:${res.status}`);
  return 解地(await res.json());
}
