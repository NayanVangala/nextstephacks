import { useEffect, useRef } from "react";

/**
 * SplitText為格,以為錯落之顯。
 *
 * Palomino splits headings into one <div> per character to stagger them, which
 * makes a screen reader read "S, P, O, R, T, S" letter by letter. We keep the
 * effect and drop the damage: the split spans are aria-hidden, and an intact
 * sr-only copy carries the real text. Same animation, correct announcement.
 */
export function SplitText({
  text,
  className = "",
  延 = 0,
  每字 = 28,
  as: As = "span",
}: {
  text: string;
  className?: string;
  /** 起手之遲,毫秒。 */
  延?: number;
  /** 字與字之間隔,毫秒。 */
  每字?: number;
  as?: "span" | "h1" | "h2" | "div";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const 減 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const 格 = [...el.querySelectorAll<HTMLElement>("[data-ch]")];

    if (減) {
      格.forEach((c) => {
        c.style.transform = "none";
        c.style.opacity = "1";
      });
      return;
    }

    let 已顯 = false;
    const 顯 = (錯落: boolean) => {
      if (已顯) return;
      已顯 = true;
      格.forEach((c, i) => {
        c.style.transitionDelay = 錯落 ? `${延 + i * 每字}ms` : "0ms";
        c.style.transform = "translateY(0)";
        c.style.opacity = "1";
      });
    };

    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) { 顯(true); io.disconnect(); }
      },
      { threshold: 0.2 },
    );
    io.observe(el);

    // 保底:文之不可見,決不可以裝飾為由。
    // IntersectionObserver 於隱藏之頁不報,故背景之頁、無 IO 之browser、
    // 或任何未及之故,皆令其文永隱。逾二秒則徑顯,不復錯落。
    const 保底 = window.setTimeout(() => { 顯(false); io.disconnect(); }, 2000);

    return () => { io.disconnect(); clearTimeout(保底); };
  }, [text, 延, 每字]);

  return (
    <As ref={ref as never} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex flex-wrap">
        {[...text].map((ch, i) => (
          <span
            key={i}
            data-ch
            className="inline-block"
            style={{
              // 初態必以 inline 為之:Tailwind v4 之 opacity-0 於 layer 中勝出,
              // 而其 translate-y 用 translate 之屬,transform 覆之不得。
              transform: "translateY(0.9em)",
              opacity: 0,
              willChange: "transform, opacity",
              transition:
                "transform 600ms cubic-bezier(0.3,1,0.7,1), opacity 600ms cubic-bezier(0.3,1,0.7,1)",
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
    </As>
  );
}
