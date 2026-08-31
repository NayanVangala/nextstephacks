import { useEffect, useMemo, useRef } from "react";
import { useNet, 建圖, 大域, 近節, 可動 } from "./useNet";

/**
 * 末節之下:鼠所在,則所及者明。
 *
 * This is the Reach algorithm, playable. The cursor is a starting point; the
 * network floods outward from it under a heat budget and everything inside
 * lights up. It is the same question the app's Reach tab asks — not "how far to
 * my destination" but "what can I actually get to" — reduced to something a
 * visitor discovers by waving a mouse over it.
 *
 * 其算與 app 者同理而簡:此無身之限,無报之罚,但以曝米為限而已。
 * Same shape as the real thing, deliberately simplified: no profile filtering,
 * no report penalties, just sun-metres against a budget. It illustrates the
 * mechanism without pretending to be the tool.
 */

export function ReachField() {
  const cv = useRef<HTMLCanvasElement>(null);
  const 網 = useNet();
  const 鼠 = useRef({ x: 0.5, y: 0.5, 有: false });
  // 端點歸格,故斷續之線得以相連。見 useNet 之 建圖。
  const 圖 = useMemo(() => (網 ? 建圖(網) : null), [網]);
  // 鼠所近之節,必取於其大域 —— 落於孤島,則但明數十段而止。
  const 域 = useMemo(() => (圖 ? 大域(圖) : null), [圖]);

  useEffect(() => {
    const c = cv.current;
    if (!c || !網 || !圖 || !域 || !可動()) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    // 段之明滅,漸而不驟。
    const 明 = new Float32Array(網.edges.length);

    const 量 = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    量();

    const 動 = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      const s = Math.max(r.width, r.height) * 1.05;
      const ox = (r.width - s) / 2;
      const oy = (r.height - s) / 2;
      鼠.current = {
        x: (e.clientX - r.left - ox) / s,
        y: (e.clientY - r.top - oy) / s,
        有: true,
      };
    };
    const 出 = () => {
      鼠.current.有 = false;
    };

    /** 自鼠所近之節,以曝米為限而洪之。Dijkstra 之簡者。 */
    const 洪 = (): Set<number> => {
      const 出集 = new Set<number>();
      if (!鼠.current.有) return 出集;
      // 0.06 為距之平方之限 —— 鼠出其網則不洪。
      const 始 = 近節(圖, 鼠.current.x, 鼠.current.y, 0.06, 域);
      if (始 < 0) return 出集;

      // 曝米之限。段長既歸一(約 0.03),故其費約 0.03 至 0.18 之間;
      // 取三,則所洪者數百段,足以見其形而不至於盡染其屏。
      // Budget tuned so the flood covers a few hundred segments: enough to read
      // as a shape spreading through streets, not so much that it floods the
      // whole canvas and stops meaning anything.
      const 限 = 3.0;
      const 負 = new Map<number, number>([[始, 0]]);
      // 小圖而已,故以陣代堆。
      const 待: [number, number][] = [[0, 始]];
      const 定 = new Set<number>();
      while (待.length) {
        待.sort((a, b) => a[0] - b[0]);
        const [d, n] = 待.shift()!;
        if (定.has(n)) continue;
        定.add(n);
        for (const e of 圖.鄰.get(n) ?? []) {
          // 午時之曝為其度 —— hero 掃其日,此則定於最烈之時。
          const nd = d + e.曝[4] * 6;
          if (nd > 限) continue;
          出集.add(e.i);
          if (nd < (負.get(e.至) ?? Infinity)) {
            負.set(e.至, nd);
            待.push([nd, e.至]);
          }
        }
      }
      return 出集;
    };

    const 幀 = () => {
      const 及 = 洪();
      ctx.clearRect(0, 0, w, h);
            // 以長邊為度,短邊則溢之 —— 城當延於框外,不當為一島浮於其中。
      const s = Math.max(w, h) * 1.05;
      const ox = (w - s) / 2;
      const oy = (h - s) / 2;

      ctx.lineCap = "round";
      for (let i = 0; i < 網.edges.length; i++) {
        const 標 = 及.has(i) ? 1 : 0;
        明[i] += (標 - 明[i]) * 0.14;
        const a = 明[i];
        const [x1, y1, x2, y2] = 網.edges[i];
        // 不及者猶見,但暗 —— 所不能至者,亦當使人見之。
        // 及者白而紫,明而粗;不及者暗而細,然猶可見 ——
        // 所不能至者亦當使人見之,隱之則其網若無缺。
        ctx.strokeStyle = `rgba(${Math.round(109 + 146 * a)},${Math.round(40 + 175 * a)},${Math.round(217 + 38 * a)},${0.13 + a * 0.82})`;
        ctx.lineWidth = 0.6 + a * 2.6;
        ctx.beginPath();
        ctx.moveTo(ox + x1 * s, oy + y1 * s);
        ctx.lineTo(ox + x2 * s, oy + y2 * s);
        ctx.stroke();
      }
      raf = requestAnimationFrame(幀);
    };

    const ro = new ResizeObserver(量);
    ro.observe(c);
    addEventListener("pointermove", 動, { passive: true });
    addEventListener("pointerleave", 出);
    raf = requestAnimationFrame(幀);
    return () => {
      ro.disconnect();
      removeEventListener("pointermove", 動);
      removeEventListener("pointerleave", 出);
      cancelAnimationFrame(raf);
    };
  }, [網, 圖, 域]);

  return (
    <canvas
      ref={cv}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full opacity-80"
    />
  );
}
