import { useEffect, useRef, useState } from "react";

/**
 * 數自零而升,至其實。既見則起,一次而已。
 *
 * The figures are the page's evidence, and a number that assembles itself asks
 * to be read in a way a number simply printed does not. It counts once, on
 * first reveal — repeating on every scroll-past would turn evidence into a toy.
 *
 * 減動之人,徑得其實 —— 不使其待。
 * Under reduced motion the final value is returned immediately: someone who has
 * asked for less movement should not be made to wait for information.
 */
export function useCountUp(至: number, { 時 = 900, 延 = 0 } = {}) {
  const [值, set值] = useState(至);
  const ref = useRef<HTMLSpanElement>(null);
  const 已 = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set值(至);
      return;
    }
    set值(0);

    let raf = 0;
    let 計時 = 0;
    const 起 = () => {
      if (已.current) return;
      已.current = true;
      計時 = window.setTimeout(() => {
        const t0 = performance.now();
        const 步 = () => {
          const k = Math.min(1, (performance.now() - t0) / 時);
          // ease-out:速起而緩止,如物之停。
          const e = 1 - Math.pow(1 - k, 3);
          set值(至 * e);
          if (k < 1) raf = requestAnimationFrame(步);
        };
        raf = requestAnimationFrame(步);
      }, 延);
    };

    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) { 起(); io.disconnect(); }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    // 保底:隱之頁不報 intersection,不可因之而永停於零。
    const 保底 = window.setTimeout(起, 2500);

    return () => {
      io.disconnect();
      clearTimeout(保底);
      clearTimeout(計時);
      cancelAnimationFrame(raf);
    };
  }, [至, 時, 延]);

  return { ref, 值 };
}

/** 「58%」「40,165」「54k」之類,解其數與其飾。 */
export function 解數(s: string): { 數: number; 前: string; 後: string } | null {
  const m = s.match(/^([^\d]*)([\d,.]+)(.*)$/);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return { 數: n, 前: m[1], 後: m[3] };
}
