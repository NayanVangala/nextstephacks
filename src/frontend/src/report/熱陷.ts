import type { CityPack, Edge, ProfileFlags } from "../types";
import { buildAdjacency, largestComponent } from "../routing/graph";
import { MinHeap } from "../routing/heap";

/**
 * 定種之偽亂數(LCG)。
 *
 * Math.random 不可用於此:報告若每次刷新而異,則不可信、不可校、不可試。
 */
export function 造亂數(種子: number): () => number {
  let s = 種子 >>> 0;
  return () => {
    // Numerical Recipes 之常數
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface 熱陷之項 {
  edge: Edge;
  介數: number;
  曝: number;
  分: number;
}

/**
 * 熱陷之段:人所必經,而日所必曝者。
 *
 * 介數之精算為 O(VE),萬節之圖不可為,故取樣 K 節各行一 Dijkstra,
 * 計段之用次以為近似。此為近似,界面必明告之。
 */
export function 熱陷(
  pack: CityPack,
  flags: ProfileFlags,
  hourIdx: number,
  { 取樣數 = 50, 取幾 = 10, 種子 = 1 } = {},
): 熱陷之項[] {
  const adj = buildAdjacency(pack, flags);
  if (adj.size === 0) return [];

  const 分支 = largestComponent(adj);
  const 節列 = [...分支];
  if (節列.length === 0) return [];

  const 亂 = 造亂數(種子);
  const 用次 = new Map<number, number>();

  const k = Math.min(取樣數, 節列.length);
  for (let i = 0; i < k; i++) {
    const 始 = 節列[Math.floor(亂() * 節列.length)];
    const 距 = new Map<number, number>([[始, 0]]);
    const 由 = new Map<number, Edge>();
    const 定 = new Set<number>();
    const 堆 = new MinHeap<number>();
    堆.push(0, 始);

    while (堆.size > 0) {
      const 今 = 堆.pop()!;
      if (定.has(今)) continue;
      定.add(今);
      for (const e of adj.get(今) ?? []) {
        const 次 = e.from === 今 ? e.to : e.from;
        if (定.has(次)) continue;
        const d = (距.get(今) ?? Infinity) + e.length_m;
        if (d < (距.get(次) ?? Infinity)) {
          距.set(次, d);
          由.set(次, e);
          堆.push(d, 次);
        }
      }
    }

    // 樹中每段之用次加一 —— 介數之近似
    for (const e of 由.values()) {
      用次.set(e.id, (用次.get(e.id) ?? 0) + 1);
    }
  }

  const 出: 熱陷之項[] = [];
  for (const e of pack.edges) {
    const 介數 = 用次.get(e.id) ?? 0;
    const 曝 = e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1;
    出.push({ edge: e, 介數, 曝, 分: 介數 * 曝 });
  }
  出.sort((a, b) => b.分 - a.分);
  return 出.slice(0, 取幾);
}
