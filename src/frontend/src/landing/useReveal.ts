import { useEffect, useRef } from "react";

/**
 * 捲至則顯。Palomino 之 staging 為 translateY(100px) 與 translateY(24px) 兩級,
 * 皆以 cubic-bezier(0.3,1,0.7,1) 六百毫秒行之。此仿其法。
 *
 * 但動 transform 與 opacity —— 不及 layout 之屬,故不致重排。
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  位移 = 100,
  延 = 0,
  門檻 = 0.15,
}: { 位移?: number; 延?: number; 門檻?: number } = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const 減 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (減) {
      el.style.transform = "none";
      el.style.opacity = "1";
      return;
    }

    el.style.transform = `translateY(${位移}px)`;
    el.style.opacity = "0";
    el.style.transition =
      "transform 600ms cubic-bezier(0.3,1,0.7,1), opacity 600ms cubic-bezier(0.3,1,0.7,1)";
    el.style.transitionDelay = `${延}ms`;

    const 顯 = () => {
      el.style.transform = "translateY(0)";
      el.style.opacity = "1";
    };

    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) { 顯(); io.disconnect(); }
      },
      { threshold: 門檻 },
    );
    io.observe(el);

    // 保底:同SplitText之理 —— 隱藏之頁不報 intersection,不可因之而永隱其文。
    const 保底 = window.setTimeout(() => { 顯(); io.disconnect(); }, 2000);

    return () => { io.disconnect(); clearTimeout(保底); };
  }, [位移, 延, 門檻]);

  return ref;
}
