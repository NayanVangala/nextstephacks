import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useNet, 建圖, 大域, 近節, 曝之rgb, type 網圖 } from "./useNet";
import { Reveal } from "./motion";
import { SplitText } from "./SplitText";
import { Magnetic } from "./Magnetic";

/**
 * 末節之器。鼠所在為其始,所及者明,而其數隨之而變。
 *
 * ── 何以易其前者 ────────────────────────────────────────────────────
 * 前者(ReachField)有四病,皆非小者:
 *   一、其幕最厚處,正其洪所發之處 —— 中心之黑八八,故其效自蔽。
 *       所以為之者,護其題也;而其護之厚薄不隨其文,乃均覆其面。
 *   二、其色紫,非其階之色。全站之曝皆青黃赤,獨此一器為紫,是別為一語。
 *   三、動而無所報。人見線明而已,不知其明者幾何、其蔭者幾何 ——
 *       是有其動而無其義。
 *   四、粗指之屏全不起。手機之人,見一靜圖而已。
 *
 * 今皆易之:幕薄而讓其器,色從其階,數隨其鼠而變,指粗者亦得其用(點之則移)。
 *
 * The previous field hid its own effect under the scrim that was protecting the
 * headline, spoke in a violet that exists nowhere else in the product, reported
 * nothing about what it had computed, and did not run at all on a touchscreen.
 * This one answers the Reach question out loud: how much of the network is
 * still open from where you are pointing, and how much of that is shaded.
 */

/** 曝米之限。量之,約染其網三之一 —— 見其界,乃見其限。 */
const 限 = 1.8;
/** 午時。八時之四 —— 其曝最烈者。 */
const 午 = 4;

interface 所及 {
  /** 段之位 -> 其費(零至限) */
  段: Map<number, number>;
  數: number;
  蔭之比: number;
}

const 空之所及: 所及 = { 段: new Map(), 數: 0, 蔭之比: 0 };

/** 自一節而洪。通者乃行 —— 不可通之段,於輪椅為牆。 */
function 洪(圖: 網圖, 始: number, 曝: (i: number) => number): 所及 {
  const 段 = new Map<number, number>();
  const 負 = new Map<number, number>([[始, 0]]);
  const 待: [number, number][] = [[0, 始]];
  const 定 = new Set<number>();
  while (待.length) {
    // 小圖而已,故以陣代堆。
    待.sort((a, b) => a[0] - b[0]);
    const [d, n] = 待.shift()!;
    if (定.has(n)) continue;
    定.add(n);
    for (const e of 圖.鄰.get(n) ?? []) {
      if (!e.通) continue;
      const nd = d + e.曝[午] * 6 + e.長;
      if (nd > 限) continue;
      if (!段.has(e.i) || nd < 段.get(e.i)!) 段.set(e.i, nd);
      if (nd < (負.get(e.至) ?? Infinity)) {
        負.set(e.至, nd);
        待.push([nd, e.至]);
      }
    }
  }
  let 蔭 = 0;
  for (const i of 段.keys()) if (曝(i) < 0.34) 蔭++;
  return {
    段,
    數: 段.size,
    蔭之比: 段.size ? Math.round((蔭 / 段.size) * 100) : 0,
  };
}

export function ReachProbe({ onEnter }: { onEnter: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const 網 = useNet();
  const 減 = useReducedMotion();
  const 圖 = useMemo(() => (網 ? 建圖(網) : null), [網]);
  const 域 = useMemo(() => (圖 ? 大域(圖) : null), [圖]);
  const [始, set始] = useState<number | null>(null);
  const [手, set手] = useState(false);

  const 曝於午 = useCallback(
    (i: number) => 網?.edges[i]?.[4]?.[午] ?? 1,
    [網],
  );

  const 及 = useMemo(
    () => (圖 && 始 != null ? 洪(圖, 始, 曝於午) : 空之所及),
    [圖, 始, 曝於午],
  );

  /*
    始之所在。人未指,則自遊於數處 —— 粗指之屏亦得見其動。
    前者於粗指之屏全不起,故手機之人但見一靜圖。
    Before any pointer arrives — and on touchscreens, where hover does not
    exist — the origin drifts between a few anchor points on its own, so the
    thing demonstrates itself instead of sitting inert.
  */
  useEffect(() => {
    if (!圖 || !域 || 手) return;
    const 錨: [number, number][] = [
      [0.3, 0.42], [0.62, 0.35], [0.5, 0.66], [0.35, 0.72], [0.7, 0.58],
    ];
    const 節 = 錨.map(([x, y]) => 近節(圖, x, y, Infinity, 域));
    set始(節[0]);
    if (減) return;
    let k = 0;
    const id = setInterval(() => {
      k = (k + 1) % 節.length;
      set始(節[k]);
    }, 2600);
    return () => clearInterval(id);
  }, [圖, 域, 手, 減]);

  /** 座之歸一。與其畫者同一算 —— 二算則其鼠與其線必離。 */
  const 位之算 = (r: DOMRect) => {
    const s = Math.max(r.width, r.height) * 1.05;
    return { s, ox: (r.width - s) / 2, oy: (r.height - s) / 2 };
  };

  const 移其始 = useCallback(
    (cx: number, cy: number) => {
      const c = cv.current;
      if (!c || !圖 || !域) return;
      const r = c.getBoundingClientRect();
      const { s, ox, oy } = 位之算(r);
      const n = 近節(圖, (cx - r.left - ox) / s, (cy - r.top - oy) / s, 0.05, 域);
      if (n >= 0) {
        set手(true);
        set始(n);
      }
    },
    [圖, 域],
  );

  useEffect(() => {
    const c = cv.current;
    if (!c || !網) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    // 段之明滅,漸而不驟 —— 始既移,其光自舊處流於新處。
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

    const 畫 = (即: boolean) => {
      const { s, ox, oy } = 位之算(c.getBoundingClientRect());
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";

      for (let i = 0; i < 網.edges.length; i++) {
        const 費 = 及.段.get(i);
        const 標 = 費 == null ? 0 : 1;
        明[i] = 即 ? 標 : 明[i] + (標 - 明[i]) * 0.12;
        const a = 明[i];
        const [x1, y1, x2, y2, su] = 網.edges[i];
        /*
          不及者猶見,但暗 —— 所不能至者亦當使人見之,隱之則其網若無缺。
          Unreachable segments stay drawn: the shape of what you cannot get to
          is half of the answer, and erasing it would make the network look
          whole.
        */
        if (a < 0.01) {
          ctx.strokeStyle = "rgba(255,255,255,0.07)";
          ctx.lineWidth = 0.7;
        } else {
          const [r0, g0, b0] = 曝之rgb(su[午]);
          /*
            近其始者明,近其限者淡 —— 其淡處即其界,而界正此節之所問。
            Fading toward the budget limit is what draws the frontier, and the
            frontier is the whole question: not how far, but how far before the
            sun stops you.
          */
          const 邊 = 費 == null ? 0 : 1 - Math.min(1, 費 / 限) * 0.72;
          ctx.strokeStyle = `rgba(${r0},${g0},${b0},${(0.1 + 0.9 * 邊) * a})`;
          ctx.lineWidth = 0.7 + (0.6 + 1.9 * 邊) * a;
        }
        ctx.beginPath();
        ctx.moveTo(ox + x1 * s, oy + y1 * s);
        ctx.lineTo(ox + x2 * s, oy + y2 * s);
        ctx.stroke();
      }

      // 始之標。無此則人不知其光自何而發。
      if (圖 && 始 != null) {
        const p = 圖.節座.get(始);
        if (p) {
          const cx = ox + p[0] * s;
          const cy = oy + p[1] * s;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, 11, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    /*
      減動則一幀而止,不起其環。
      Reduced motion draws one settled frame and never starts a loop: the
      picture is the point, the easing is not.
    */
    if (減) {
      畫(true);
    } else {
      const 幀 = () => {
        畫(false);
        raf = requestAnimationFrame(幀);
      };
      raf = requestAnimationFrame(幀);
    }

    const ro = new ResizeObserver(() => {
      量();
      畫(true);
    });
    ro.observe(c);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [網, 圖, 及, 始, 減]);

  const 總 = 網?.edges.length ?? 0;

  return (
    <section
      aria-label="Enter"
      className="relative flex flex-col items-center justify-center overflow-hidden border-t border-white/10 px-6 py-[144px] text-center"
    >
      <canvas
        ref={cv}
        aria-hidden
        onPointerMove={(e) => e.pointerType === "mouse" && 移其始(e.clientX, e.clientY)}
        onPointerDown={(e) => 移其始(e.clientX, e.clientY)}
        className="absolute inset-0 size-full touch-none"
      />
      {/*
        幕薄矣,且止於其文之後。前者中心之黑八八 —— 而其洪正發於其中心,
        是以其護文者,自蔽其器。今但護其文之帶,其餘讓之。
        The old scrim was 88% black at the centre, which is exactly where the
        flood originates: it was hiding the effect it sat on top of. This one
        darkens the band behind the type and lets the rest of the field show.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[420px] -translate-y-1/2 bg-[linear-gradient(180deg,rgba(6,8,12,0)_0%,rgba(6,8,12,0.72)_22%,rgba(6,8,12,0.82)_50%,rgba(6,8,12,0.72)_78%,rgba(6,8,12,0)_100%)]"
      />
      <div className="pointer-events-none relative">
        <SplitText as="h2" text="NOW WALK IT."
          className="landing-display h-3xl block" />

        {/*
          其數隨其鼠而變 —— 此為其動之義,非其飾。
          aria-live 為 polite:其數變頻,若為 assertive 則讀屏之人不勝其擾。
          The readout is the point of the interaction rather than decoration on
          top of it. Announced politely: this updates as the pointer moves, and
          an assertive region would talk over everything else on the page.
        */}
        <Reveal 延={0.15}>
          <p
            aria-live="polite"
            className="t-xs mt-[36px] text-white/85 [text-shadow:0_1px_12px_rgba(6,8,12,0.95)]"
          >
            <span className="landing-display text-[2.5rem] leading-none tabular-nums">
              {及.數}
            </span>
            <span className="ml-3">
              of {總.toLocaleString()} segments still reachable under a heat
              budget — {及.蔭之比}% of them in shade at 14:00
            </span>
          </p>
        </Reveal>

        <Reveal 延={0.25}>
          <div className="pointer-events-auto mt-[36px] flex flex-wrap items-center justify-center gap-[20px]">
            <Magnetic 力={0.4}>
              <button
                type="button"
                onClick={onEnter}
                className="t-xs rounded-full bg-white px-10 py-4 text-black transition-[opacity,scale] duration-150 ease-quint hover:scale-[1.03] hover:opacity-90"
              >
                Open the tool
              </button>
            </Magnetic>
            <a
              href="https://github.com/NayanVangala/nextstephacks"
              className="t-xs group inline-flex items-center gap-2 border-b border-white/30 pb-1 transition-colors duration-150 ease-quint hover:border-white"
            >
              Read the source
              <span aria-hidden className="transition-transform duration-150 ease-quint group-hover:translate-x-1">→</span>
            </a>
          </div>
        </Reveal>

        <p className="t-4xs mt-[20px] text-white/55">
          {手
            ? "Every lit segment is one you could still get to and back from"
            : "Move your cursor over the network — or tap it — to move the starting point"}
        </p>
      </div>
    </section>
  );
}
