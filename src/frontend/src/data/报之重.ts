import type { 报 } from "./本地庫";

/**
 * 报之重:眾則益之,久則衰之,爭則損之。
 *
 * The report system already raised the cost of a reported segment, but every
 * report counted the same forever: one person and ten people were identical, and
 * a report from last winter about a construction hoarding that came down in
 * March still rerouted people today. That is a system that ACCEPTS local
 * knowledge without ever getting better at it.
 *
 * 三者而已,無所謂學習:
 *   眾 — 數人所報者,重於一人。然十人不當十倍於一人。
 *   久 — 障多暫而非永。久而不復報者,其重當衰。
 *   爭 — 有言其非者,則其重當損。
 *
 * Deliberately NOT called machine learning. It is confirmation weighting with
 * exponential decay — a weighted heuristic whose every term can be read off the
 * screen and checked by the person it affects. Calling it learning would be the
 * same overclaim this project refuses everywhere else.
 */

/** 一报之基。爭者為負 —— 其言「非也」,則當損其重,非徒不益。 */
export const 基之重: Record<报["status"], number> = {
  unverified: 150,
  confirmed: 400,
  disputed: -200,
};

/**
 * 半衰之日。九十日而其重減半。
 *
 * Ninety days is a guess, and it is the right KIND of guess: most reported
 * barriers are temporary (works, a skip, a parked trailer) and a permanent one
 * gets re-reported, which refreshes its weight. Too long and the map fossilises
 * around problems that were fixed; too short and a real barrier vanishes before
 * anyone walks there again.
 */
export const 半衰之日 = 90;

/** 一报之衰。今之报為一,九十日前者半,百八十日前者四分之一。 */
export function 衰(报: 报, 今 = Date.now()): number {
  const t = Date.parse(报.created_at);
  if (Number.isNaN(t)) return 1; // 其時不可解者,不衰之 —— 疑則從其重。
  const 日 = (今 - t) / 86_400_000;
  if (日 <= 0) return 1; // 來日之报(鐘之偏)不當益其重。
  return Math.pow(0.5, 日 / 半衰之日);
}

/** 一报之重,已衰者。 */
export function 一报之重(报: 报, 今 = Date.now()): number {
  return 基之重[报.status] * 衰(报, 今);
}

/**
 * 一段之罰。眾报以調和之法遞減。
 *
 * Harmonic damping: sorted by weight, the first report counts fully, the second
 * a half, the third a third. Ten identical reports come to about 2.9x one
 * report rather than 10x. Linear addition would let a handful of reports — or
 * one determined person filing repeatedly — make a segment effectively
 * impassable, which is a hole a routing tool cannot afford.
 *
 * INVARIANT: the result is never negative. edgeCost adds this to a length-based
 * floor, and the A* heuristic is admissible only while every added term is >= 0.
 * Disputes may cancel a penalty to zero; they may never make a segment cheaper
 * than its own length.
 */
export function 段之罰(报列: 报[], 今 = Date.now()): number {
  if (报列.length === 0) return 0;
  const 重 = 报列
    .map((r) => 一报之重(r, 今))
    .sort((a, b) => b - a);
  let 總 = 0;
  for (let i = 0; i < 重.length; i++) 總 += 重[i] / (i + 1);
  return Math.max(0, 總);
}

/** 諸段之罰。routing 以此為其罚之表。 */
export function 罰之表(报列: 报[], 今 = Date.now()): Map<number, number> {
  const 聚 = new Map<number, 报[]>();
  for (const r of 报列) {
    const 有 = 聚.get(r.edge_id);
    if (有) 有.push(r);
    else 聚.set(r.edge_id, [r]);
  }
  const m = new Map<number, number>();
  for (const [id, 列] of 聚) {
    const v = 段之罰(列, 今);
    // 零者不入其表 —— 其罚既無,則不必載之。
    if (v > 0) m.set(id, v);
  }
  return m;
}

export interface 段之狀 {
  總數: number;
  確認: number;
  存疑: number;
  未驗: number;
  /** 最新之报,以毫秒計。無则 null。 */
  最新: number | null;
  罰: number;
}

/** 一段之狀,示之於人。 */
export function 段之狀(报列: 报[], 今 = Date.now()): 段之狀 {
  let 最新: number | null = null;
  let 確認 = 0;
  let 存疑 = 0;
  let 未驗 = 0;
  for (const r of 报列) {
    if (r.status === "confirmed") 確認 += 1;
    else if (r.status === "disputed") 存疑 += 1;
    else 未驗 += 1;
    const t = Date.parse(r.created_at);
    if (!Number.isNaN(t) && (最新 === null || t > 最新)) 最新 = t;
  }
  return { 總數: 报列.length, 確認, 存疑, 未驗, 最新, 罰: 段之罰(报列, 今) };
}

/** 「二日前」之類。示其新舊,俾人自斷其可信。 */
export function 幾時之前(ms: number, 今 = Date.now()): string {
  const 日 = Math.floor((今 - ms) / 86_400_000);
  if (日 <= 0) return "today";
  if (日 === 1) return "yesterday";
  if (日 < 30) return `${日} days ago`;
  const 月 = Math.floor(日 / 30);
  return 月 === 1 ? "a month ago" : `${月} months ago`;
}
