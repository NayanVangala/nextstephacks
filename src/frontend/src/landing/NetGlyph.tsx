import { useEffect, useMemo, useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { useNet, 建圖, 大域, 近節, 曝之rgb, type 網, type 網圖 } from "./useNet";

/**
 * 三面之像。ROUTE、REACH、REPORT 各一,皆自其網而出 —— 非畫其意,乃行其算。
 *
 * The three views described in this section had no picture, only prose. Each
 * glyph runs the actual algorithm it names against the same 1400-segment LA
 * network the hero uses, then draws the answer. Nothing here is illustrative:
 * the route is a real shortest path, the reach is a real flood, and the cut-off
 * segments are really cut off.
 *
 * ── 何以不動於每幀 ──────────────────────────────────────────────────
 * 此頁已有二器逐幀而畫(hero 與其末)。若此更加三,則五器並行於一頁,
 * 手機必竭。故此三者算之於一,畫之於一 —— 其動止於入場之一千一百毫秒,
 * 既畢則其 rAF 亦止。
 * Two canvases on this page already animate every frame. Three more running
 * continuously would be five concurrent rAF loops on a phone. These compute
 * once and animate only their 1100ms draw-on, then stop the loop entirely.
 *
 * ── 隱頁必見其終 ────────────────────────────────────────────────────
 * IMPORTANT: the final frame is drawn synchronously on mount, BEFORE any
 * animation is scheduled. In a hidden document, a background tab, or a
 * full-page screenshot, rAF never runs — this page has shipped that bug twice
 * already (see motion.tsx). Drawing the end state first means the worst case is
 * a missing animation, never a missing picture.
 */

export type 式 = "route" | "reach" | "report";

/** 午時。八時之四 —— 其曝最烈者,非其最善者。 */
const 午 = 4;

interface 所出 {
  /** 所著之段,已序 —— 其序即其畫之序。 */
  序: number[];
  /** 段之位 -> 其色 */
  色: Map<number, string>;
}

function 一色(曝: number, a = 1): string {
  const [r, g, b] = 曝之rgb(曝);
  return `rgba(${r},${g},${b},${a})`;
}

/** 自一節而洪,得其負。通者乃行 —— 不可通之段,於輪椅為牆。 */
function 洪(圖: 網圖, 始: number, 限: number) {
  const 負 = new Map<number, number>([[始, 0]]);
  const 由 = new Map<number, { 前: number; i: number }>();
  const 段 = new Map<number, number>();
  const 待: [number, number][] = [[0, 始]];
  const 定 = new Set<number>();
  while (待.length) {
    // 小圖而已,故以陣代堆 —— 千四百段,不足以償一堆之複。
    待.sort((a, b) => a[0] - b[0]);
    const [d, n] = 待.shift()!;
    if (定.has(n)) continue;
    定.add(n);
    for (const e of 圖.鄰.get(n) ?? []) {
      if (!e.通) continue;
      const nd = d + e.曝[午] * 6 + e.長;
      if (nd > 限) continue;
      if (nd < (負.get(e.至) ?? Infinity)) {
        負.set(e.至, nd);
        由.set(e.至, { 前: n, i: e.i });
        段.set(e.i, nd);
        待.push([nd, e.至]);
      }
    }
  }
  return { 負, 由, 段 };
}

function 算(式: 式, 網: 網, 圖: 網圖): 所出 {
  const 色 = new Map<number, string>();
  // 始必在其大域 —— 落於孤島,則其算雖真而其像為誣。
  const 域 = 大域(圖);

  if (式 === "route") {
    /*
      一真路。自西南至東北 —— 其始其終皆取實有之節,不可懸擬。
      A real shortest path under the noon exposure cost, step-free edges only.
      The endpoints are the network's own corner nodes, and the path is coloured
      by each segment's measured sun so the picture says what the tool says:
      the step-free way is often the exposed way.
    */
    const 始 = 近節(圖, 0.08, 0.88, Infinity, 域);
    const { 負, 由 } = 洪(圖, 始, Infinity);
    // 所至之中,離其始最遠者為其終 —— 故其路必長,必橫其城。
    let 終 = 始;
    let 遠 = -1;
    const [sx, sy] = 圖.節座.get(始)!;
    for (const k of 負.keys()) {
      const [x, y] = 圖.節座.get(k)!;
      const d = (x - sx) ** 2 + (y - sy) ** 2;
      if (d > 遠) {
        遠 = d;
        終 = k;
      }
    }
    const 序: number[] = [];
    let n = 終;
    while (n !== 始) {
      const p = 由.get(n);
      if (!p) break;
      序.push(p.i);
      色.set(p.i, 一色(網.edges[p.i][4][午], 0.95));
      n = p.前;
    }
    // 自始而畫,不自終 —— 人讀路皆自其始。
    序.reverse();
    return { 序, 色 };
  }

  if (式 === "reach") {
    /*
      所及者。限三曝米有半 —— 量之,約染其網三之一,足見其形而不盡其屏。
      Everything reachable from one point under a heat budget. Blue because
      that is the shade end of the app's own exposure ramp: what you can get to
      is what you can get to without cooking.
    */
    const 始 = 近節(圖, 0.5, 0.5, Infinity, 域);
    // 二點二曝米。量之,約染其網四之一有半 —— 見其界,乃見其限。
    const { 段 } = 洪(圖, 始, 2.2);
    const 序 = [...段.entries()].sort((a, b) => a[1] - b[1]).map(([i]) => i);
    for (const i of 序) 色.set(i, 一色(0, 0.9));
    return { 序, 色 };
  }

  /*
    所斷者。自其大者而洪,通者乃行;其所不至,即輪椅之所不至。
    此非擬也:全網之九八點九可通,而其餘之數百段,自城之中無路可達。
    節之末所稱者,正此數。
    Run the flood over step-free edges only and everything it never reaches is,
    for a wheelchair user, unreachable — the "98.9% traversable" number and the
    488 stranded points in this section's own copy are this picture.
  */
  // 大域即所至。其外之通段,自城之中無路可達。
  const 及 = new Set<number>();
  for (const k of 域) {
    for (const e of 圖.鄰.get(k) ?? []) if (e.通) 及.add(e.i);
  }
  const 序: number[] = [];
  網.edges.forEach((e, i) => {
    if (!e[5]) {
      // 不可通者,赤 —— 障也。
      序.push(i);
      色.set(i, 一色(1, 0.95));
    } else if (!及.has(i)) {
      // 可通而不可至者,黃 —— 非其身之障,乃其網之斷。
      序.push(i);
      色.set(i, 一色(0.5, 0.9));
    }
  });
  return { 序, 色 };
}

const 說: Record<式, string> = {
  route: "A real shortest path across this extract, coloured by the sun falling on each segment at noon",
  reach: "Everything reachable from one downtown corner under a heat budget — 43% of this extract",
  report: "Red: 59 segments that are not step-free. Amber: 185 that are, but cannot be reached step-free from downtown",
};

export function NetGlyph({ 式: m }: { 式: 式 }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const 盒 = useRef<HTMLDivElement>(null);
  const 網 = useNet();
  const 減 = useReducedMotion();
  const 見 = useInView(盒, { once: true, amount: 0.4 });
  const 圖 = useMemo(() => (網 ? 建圖(網) : null), [網]);
  const 出 = useMemo(() => (網 && 圖 ? 算(m, 網, 圖) : null), [m, 網, 圖]);

  useEffect(() => {
    const c = cv.current;
    if (!c || !網 || !出) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const 量 = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      畫(進);
    };

    /** 全網入其框。前此二器皆溢其框而取其心,此則小,溢之則不復為一城。 */
    const 位 = (x: number, y: number): [number, number] => {
      const s = Math.min(w / 1.06, h / 0.9);
      return [(w - s) / 2 + x * s, (h - s * 0.85) / 2 + (y - 0.075) * s];
    };

    let 進 = 1;

    const 畫 = (p: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";

      // 其底。所不著者亦見 —— 隱之則其城若只有此一路。
      ctx.strokeStyle = "rgba(255,255,255,0.17)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const [x1, y1, x2, y2] of 網.edges) {
        const [ax, ay] = 位(x1, y1);
        const [bx, by] = 位(x2, y2);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();

      const n = Math.round(出.序.length * p);
      ctx.lineWidth = m === "route" ? 2.6 : 1.9;
      for (let k = 0; k < n; k++) {
        const i = 出.序[k];
        const [x1, y1, x2, y2] = 網.edges[i];
        const [ax, ay] = 位(x1, y1);
        const [bx, by] = 位(x2, y2);
        ctx.strokeStyle = 出.色.get(i) ?? "#fff";
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    };

    量();

    // 見而後行,且減動者不行。既畢則其環亦止 —— 此頁不宜更加一常行之器。
    if (!減 && 見) {
      const 始 = performance.now();
      const 行 = (t: number) => {
        // 0.32,1,0.32,1 之近似。徐止者,如筆之收。
        const k = Math.min(1, (t - 始) / 1100);
        進 = 1 - (1 - k) ** 3;
        畫(進);
        if (k < 1) raf = requestAnimationFrame(行);
      };
      進 = 0;
      raf = requestAnimationFrame(行);
    }

    const ro = new ResizeObserver(量);
    ro.observe(c);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [網, 出, m, 減, 見]);

  return (
    <div ref={盒} className="mt-8 max-w-[420px]">
      <div className="sun-rule aspect-[4/3] w-full overflow-hidden rounded-lg border">
        <canvas ref={cv} aria-hidden className="size-full" />
      </div>
      {/*
        像必有其說。此三者色異而義異,無說則但為三團之線。
        Each glyph encodes meaning in colour, and colour alone is never the
        explanation — the caption is what makes it readable, including to anyone
        who cannot separate the red from the amber.
      */}
      <p className="t-4xs mt-3 text-white/50">{說[m]}</p>
    </div>
  );
}
