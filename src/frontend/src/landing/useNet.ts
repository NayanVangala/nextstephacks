import { useEffect, useState } from "react";

/**
 * landing 之網:洛城真實之人行道,九百段,已歸一於零至一。
 *
 * Not decoration standing in for the product — this IS the product's data, at
 * 59 KB. A landing page for a routing tool that illustrated itself with stock
 * photography would be describing something it declined to show.
 *
 * 取之而不得,則其效不起,而頁如常。動之於此為錦上之花,非其所賴。
 * Failure is silent by design: the canvas simply never starts and the page reads
 * exactly as it does without JavaScript. A decorative layer must never be able
 * to take the content with it.
 */

/** [x1, y1, x2, y2, 八時之曝, 輪椅可通乎] */
export type 一段 = [number, number, number, number, number[], number];

export interface 網 {
  hours: number[];
  edges: 一段[];
}

export function useNet(): 網 | null {
  const [網, set網] = useState<網 | null>(null);
  useEffect(() => {
    let 棄 = false;
    fetch(`${import.meta.env.BASE_URL}landing-net.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!棄 && d && Array.isArray(d.edges)) set網(d as 網);
      })
      .catch(() => {
        // 靜默。此為裝飾,不可以其敗累其文。
      });
    return () => {
      棄 = true;
    };
  }, []);
  return 網;
}

/** 動之當否。減動之人、粗指之屏,皆不起。 */
export function 可動(): boolean {
  if (typeof matchMedia !== "function") return false;
  return (
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !matchMedia("(pointer: coarse)").matches
  );
}

/** 曝之色,與 app 同階。此處用 rgb 之值 —— canvas 不解 CSS 之變數。 */
/** #rrggbb -> [r,g,b]。不合則還其備。 */
function 解其色(s: string, 備: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return 備;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/*
  三墨自其籤而取,不復書其實值。
  前此此處釘暗地之三色,而 landing 恆暗,故無害;今 landing 從其紙,
  釘之則晝印之網猶用夜印之墨 —— 其藍於紙上刺目,而其橙反晦。

  canvas 不解 var(),故必先取其實 —— 與 MapCanvas 之 取曝之板 同法。
  The ramp now resolves from the live tokens instead of pinning the dark-pull
  values. That pin was safe only while the landing was dark by construction;
  now that it follows the theme, a pinned ramp would print night ink on the day
  sheet. Canvas cannot read var(), so the values are resolved off the document,
  the same way MapCanvas already does it.
*/
export function 曝之rgb(曝: number): [number, number, number] {
  const s = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement)
    : null;
  const 取 = (名: string, 備: [number, number, number]): [number, number, number] =>
    s ? 解其色(s.getPropertyValue(`--color-${名}`), 備) : 備;

  const 階: [number, [number, number, number]][] = [
    [0, 取("shade", [91, 155, 255])],
    [0.5, 取("midsun", [226, 166, 60])],
    [1, 取("fullsun", [255, 107, 91])],
  ];
  const t = Math.max(0, Math.min(1, 曝));
  for (let i = 1; i < 階.length; i++) {
    const [p0, c0] = 階[i - 1];
    const [p1, c1] = 階[i];
    if (t <= p1) {
      const k = (t - p0) / (p1 - p0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return 階[階.length - 1][1];
}

/* ────────────────────────────────────────────────────────────────────────
   鄰接。前此獨在 ReachField 之中,今 NetGlyph 亦需之,故舉於此。
   The adjacency build lived inside ReachField; NetGlyph needs the same thing,
   so it moves here rather than being written twice.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * 端點歸格之度。同格者視為一節 —— 其線斷續,不歸則不相連。
 *
 * MUST stay near the coordinate quantum. This was 0.012, which is more than
 * twice the median segment length (0.0056): 597 of the 1400 segments collapsed
 * to a single point and vanished from the graph entirely, so the flood was
 * silently walking 43% less network than the canvas was drawing, and could not
 * cross any short segment at all. The coordinates are quantised to 0.0001, so
 * 0.0004 absorbs rounding without merging distinct corners — measured, it
 * leaves 2 degenerate segments instead of 597, and the answer stops changing
 * below it (identical results at 0.0002 and 0.0001).
 */
const 格 = 0.0004;

function 鑰(x: number, y: number): number {
  return Math.round(x / 格) * 100000 + Math.round(y / 格);
}

export interface 一鄰 {
  /** 所至之節 */
  至: number;
  /** 八時之曝,已乘其長 —— 曝米,非曝率。 */
  曝: number[];
  /** 其段於 網.edges 之位 */
  i: number;
  長: number;
  /** 輪椅可通乎 */
  通: boolean;
}

export interface 網圖 {
  鄰: Map<number, 一鄰[]>;
  節座: Map<number, [number, number]>;
}

export function 建圖(網: 網): 網圖 {
  const 鄰 = new Map<number, 一鄰[]>();
  const 節座 = new Map<number, [number, number]>();
  網.edges.forEach(([x1, y1, x2, y2, su, 通], i) => {
    const a = 鑰(x1, y1);
    const b = 鑰(x2, y2);
    if (a === b) return;
    節座.set(a, [x1, y1]);
    節座.set(b, [x2, y2]);
    const 長 = Math.hypot(x2 - x1, y2 - y1);
    const w = su.map((v) => v * 長);
    const e = { 曝: w, i, 長, 通: !!通 };
    if (!鄰.has(a)) 鄰.set(a, []);
    if (!鄰.has(b)) 鄰.set(b, []);
    鄰.get(a)!.push({ ...e, 至: b });
    鄰.get(b)!.push({ ...e, 至: a });
  });
  return { 鄰, 節座 };
}

/**
 * 節之最近於一點者。不得則 -1。限者,距之平方也。
 * 域若予之,則但取其中者 —— 見 大域。
 */
export function 近節(
  圖: 網圖,
  x: number,
  y: number,
   限 = Infinity,
  域?: Set<number>,
): number {
  let 得 = -1;
  let best = 限;
  for (const [k, [nx, ny]] of 圖.節座) {
    if (域 && !域.has(k)) continue;
    const d = (nx - x) ** 2 + (ny - y) ** 2;
    if (d < best) {
      best = d;
      得 = k;
    }
  }
  return 得;
}

/**
 * 最大之通域。通者乃行 —— 故此為輪椅之所能至之最大者。
 *
 * 洪之始若落於孤島,則其洪止於數十段,而人以為此器之力止於是。
 * 量之:近乎全網之心者,正在一九三段之島中 —— 而其大域一一五五節。
 * Every flood needs a start node inside the main component. The node nearest
 * the centre of this extract sits in a 93-segment island, so seeding by
 * proximity alone made the whole Reach illustration look like the algorithm
 * gave up after one block.
 */
export function 大域(圖: 網圖): Set<number> {
  const 曾 = new Set<number>();
  let 大 = new Set<number>();
  for (const n of 圖.鄰.keys()) {
    if (曾.has(n)) continue;
    const 域 = new Set([n]);
    const 待 = [n];
    曾.add(n);
    while (待.length) {
      const c = 待.pop()!;
      for (const e of 圖.鄰.get(c) ?? []) {
        if (!e.通 || 曾.has(e.至)) continue;
        曾.add(e.至);
        域.add(e.至);
        待.push(e.至);
      }
    }
    if (域.size > 大.size) 大 = 域;
  }
  return 大;
}
