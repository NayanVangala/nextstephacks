import { useEffect, useRef } from "react";

/**
 * 一版之墨。riso 之所以為 riso,在此,不在其色。
 *
 * ── 何以立此 ─────────────────────────────────────────────────────────
 * 前此所為者,易其色而已 —— 米白之地,三墨之線,而其線皆一二像素之細。
 * riso 無此物。riso 者,一版一墨,其墨平而厚,其面為實,其淡處非淡墨,
 * 乃疏其點 —— 是為網目(halftone)。故其淡與其濃,皆同一墨,異其點之大小耳。
 *
 * 此件所畫者即其網目:點列於斜格(四十五度,印之常),其徑隨其濃而長。
 * 濃者點相接而成實面,淡者點疏而見其紙。此為 riso 之面,非其色。
 *
 * A Riso tint is not a lighter ink — it is the same ink at a smaller dot. This
 * draws that: dots on a 45° grid (the printer's convention), radius driven by
 * the tint field, so dense areas close into flat colour and light areas open up
 * and show the paper between them. That transition is the medium's signature,
 * and it cannot be faked with opacity.
 */

/** 點之格。八像素者,近其常;過小則如噪,過大則如圖案。 */
const 格 = 8;
/** 網之角。四十五度為印之常 —— 二版同角則生莫列(moiré),故各版異其角。 */
const 常角 = Math.PI / 4;

export function RisoPlate({
  形,
  色,
  角 = 常角,
  className = "",
  最大 = 0.52,
}: {
  /**
   * 濃之場。予其座(零至一),還其濃(零至一)。
   * 零則無點,一則其點相接而成實面。
   */
  形: (x: number, y: number) => number;
  色: string;
  角?: number;
  className?: string;
  /** 點之最大半徑,以格為度。逾零點五則相接,故實面自此生。 */
  最大?: number;
}) {
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const 畫 = () => {
      const r = c.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (!w || !h) return;
      /*
        點必落於整像素之格,不隨屏之密而變其數 —— 不然則二屏異其面,
        而其網之疏密不復為所量之值,乃為其屏之偶然。
        The dot grid is defined in CSS pixels and only the backing store scales,
        so the screen reads the same on any display: the dot count encodes the
        tint, and letting device pixel ratio change it would make the texture an
        accident of hardware.
      */
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      /*
        其色必先取其實 —— canvas 不解 var()。
        canvas 之 fillStyle 得 "var(--color-fullsun)" 者,非誤也,乃默然畫黑。
        此樹之 MapCanvas 已為此立一註,而此件復蹈之:三版皆黑,故其面為灰,
        而三墨之色一無所見 —— 所謂「但易其色」者,其實並色亦未易。
        MUST resolve first: canvas fillStyle given "var(--color-fullsun)" does
        not error, it silently paints black. MapCanvas carries a comment about
        this exact trap and this component walked into it anyway — all three
        plates were rendering black, which is why the hero read as grey texture
        rather than as coloured ink.
      */
      const 實色 = 色.startsWith("var(")
        ? getComputedStyle(document.documentElement)
            .getPropertyValue(色.slice(4, -1).trim())
            .trim() || "#000"
        : 色;
      ctx.fillStyle = 實色;

      const cos = Math.cos(角);
      const sin = Math.sin(角);
      // 斜格之對角,故其巡必逾其面 —— 不然則角有遺。
      const 遠 = Math.hypot(w, h);
      const n = Math.ceil(遠 / 格);

      ctx.beginPath();
      for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
          // 格之座旋其角,乃得其屏之座。
          const x = (i * 格) * cos - (j * 格) * sin + w / 2;
          const y = (i * 格) * sin + (j * 格) * cos + h / 2;
          if (x < -格 || y < -格 || x > w + 格 || y > h + 格) continue;
          const t = 形(x / w, y / h);
          if (t <= 0.004) continue;
          // 其徑隨其濃之方根 —— 目所感者其面,非其徑。
          const rad = Math.sqrt(Math.min(1, t)) * 格 * 最大;
          if (rad < 0.25) continue;
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    畫();
    const ro = new ResizeObserver(畫);
    ro.observe(c);
    return () => ro.disconnect();
  }, [形, 色, 角, 最大]);

  return (
    <canvas
      ref={cv}
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
    />
  );
}
