import type { CityPack, ProfileFlags } from "../types";

/**
 * 一路寓於其址。
 *
 * Encoding the route into the URL makes a walk shareable, makes a demo
 * reproducible, and means a link in a writeup opens on a real route instead of
 * an empty map. It also introduces the only untrusted input this app has, so
 * everything below treats the hash as hostile.
 *
 * ORDER MATTERS: parse first, validate ONLY after the city pack has loaded. The
 * hash is readable on mount and the pack is not, so a node id cannot be checked
 * for existence until the pack resolves. Restoring before that check is how a
 * stale link silently produces a route through points nobody chose.
 */

export interface 址之狀 {
  city: string | null;
  view: string | null;
  origin: number | null;
  dest: number | null;
  flags: ProfileFlags | null;
  hourIdx: number | null;
}

const 空: 址之狀 = {
  city: null, view: null, origin: null, dest: null, flags: null, hourIdx: null,
};

function 解整(v: string | null): number | null {
  if (v == null || v === "") return null;
  // Number() 於 "" 回零,於 "12abc" 回 NaN。二者皆不可為節之號。
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
}

/** 身以三字記之,如 "101"。次序:輪椅、盲、畏暑。 */
function 解身(v: string | null): ProfileFlags | null {
  if (v == null || !/^[01]{3}$/.test(v)) return null;
  return {
    wheelchair: v[0] === "1",
    blind_low_vision: v[1] === "1",
    heat_sensitive: v[2] === "1",
  };
}

export function 記身(f: ProfileFlags): string {
  return `${f.wheelchair ? 1 : 0}${f.blind_low_vision ? 1 : 0}${f.heat_sensitive ? 1 : 0}`;
}

/** 自 hash 解其狀。凡不合式者一律作 null,不擲。 */
export function 解址(hash: string = location.hash): 址之狀 {
  const i = hash.indexOf("?");
  if (i < 0) return 空;
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(hash.slice(i + 1));
  } catch {
    return 空;
  }
  const h = 解整(q.get("h"));
  return {
    city: q.get("c"),
    view: q.get("v"),
    origin: 解整(q.get("o")),
    dest: 解整(q.get("d")),
    flags: 解身(q.get("p")),
    // 時之序有界。逾界者棄之 —— 界面以此索 sun_exposure,逾則靜取全曝而人不覺。
    hourIdx: h != null && h >= 0 && h < 24 ? h : null,
  };
}

export function 成址(s: {
  city: string;
  view: string;
  origin: number | null;
  dest: number | null;
  flags: ProfileFlags;
  hourIdx: number;
}): string {
  const q = new URLSearchParams();
  q.set("c", s.city);
  q.set("v", s.view);
  if (s.origin != null) q.set("o", String(s.origin));
  if (s.dest != null) q.set("d", String(s.dest));
  q.set("p", 記身(s.flags));
  q.set("h", String(s.hourIdx));
  return `#/app?${q.toString()}`;
}

export interface 驗之果 {
  origin: number | null;
  dest: number | null;
  /** 址有節而囊無之者。此非空鏈,乃陳鏈 —— 必告之,不可默然而歸於空。 */
  失之節: number[];
}

/**
 * 囊既至,乃驗其節。
 *
 * A node id that is not in the pack means the link was made against a different
 * build of the sidewalk data. Snapping to the nearest node instead would show a
 * route the sharer never saw, with nothing on screen saying so — which is worse
 * than an error, because it is confidently wrong.
 */
export function 驗其節(pack: CityPack, origin: number | null, dest: number | null): 驗之果 {
  const 有 = new Set(pack.nodes.map((n) => n.id));
  const 失: number[] = [];
  if (origin != null && !有.has(origin)) 失.push(origin);
  if (dest != null && !有.has(dest)) 失.push(dest);
  return {
    origin: origin != null && 有.has(origin) ? origin : null,
    dest: dest != null && 有.has(dest) ? dest : null,
    失之節: 失,
  };
}
