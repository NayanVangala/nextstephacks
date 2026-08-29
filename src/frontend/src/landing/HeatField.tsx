import { useEffect, useRef } from "react";
import { useNet, 可動, 曝之rgb } from "./useNet";

/**
 * hero 之下,真實之洛城人行道。鼠橫移則時辰隨之。
 *
 * The headline says heat has a geometry. This is that geometry, drawn from the
 * same 900 segments the router uses, recoloured live as the cursor sweeps the
 * day from 6am to 8pm. Moving left to right takes the network from cool morning
 * blue through midday red and back — the product's entire premise, made
 * something you discover with your hand rather than read.
 *
 * 2d canvas,無 WebGL —— 與圖同理。此頁已因 WebGL 之賴而白過一次。
 * A 2D canvas, deliberately: this project has already shipped one blank page by
 * assuming a GPU, and a decorative flourish is the last thing that should
 * reintroduce that risk.
 */
export function HeatField() {
  const cv = useRef<HTMLCanvasElement>(null);
  const 網 = useNet();
  const 時 = useRef(0.55); // 零至一,晨至暮
  const 的時 = useRef(0.55);

  useEffect(() => {
    const c = cv.current;
    if (!c || !網 || !可動()) return;
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
    };
    量();

    const 動 = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      的時.current = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    };

    const 幀 = () => {
      // 隨而不即,故其變如日之行,非如閘之啟。
      時.current += (的時.current - 時.current) * 0.07;
      const t = 時.current;
      // 零至一 映於 八時之序。
      const f = t * (網.hours.length - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(網.hours.length - 1, i0 + 1);
      const k = f - i0;

      ctx.clearRect(0, 0, w, h);

      // 以長邊為度,短邊則溢之 —— 城當延於框外,不當為一島浮於其中。
      const s = Math.max(w, h) * 1.05;
      const ox = (w - s) / 2;
      const oy = (h - s) / 2;

      ctx.lineCap = "round";
      for (const [x1, y1, x2, y2, su, 通] of 網.edges) {
        const 曝 = (su[i0] ?? 1) * (1 - k) + (su[i1] ?? 1) * k;
        const [r, g, b] = 曝之rgb(曝);
        // 不可通者灰,且細 —— 於 app 中亦然。
        if (通 === 0) {
          ctx.strokeStyle = "rgba(161,161,170,0.35)";
          ctx.lineWidth = 0.7;
        } else {
          // 曝愈甚則愈明,故午時其網如燒。
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 + 曝 * 0.5})`;
          ctx.lineWidth = 0.6 + 曝 * 1.1;
        }
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
    raf = requestAnimationFrame(幀);
    return () => {
      ro.disconnect();
      removeEventListener("pointermove", 動);
      cancelAnimationFrame(raf);
    };
  }, [網]);

  return (
    <canvas
      ref={cv}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full opacity-70"
    />
  );
}
