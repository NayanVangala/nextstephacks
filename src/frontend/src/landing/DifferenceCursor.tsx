import { useEffect, useRef, useState } from "react";

/**
 * 異色之游標:以 mix-blend-mode: difference 反其所覆之色。
 *
 * Palomino hides the native cursor outright (`cursor: none`). That is hostile
 * to anyone who relies on the system pointer — enlarged cursors, high-contrast
 * pointers, motor-impairment aids. Here the native cursor STAYS; this rides on
 * top of it. The effect survives, the accessibility cost does not.
 *
 * Disabled entirely for reduced-motion and for coarse pointers (no cursor to
 * decorate on a touchscreen).
 */
export function DifferenceCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [用之, set用之] = useState(false);

  useEffect(() => {
    const 減 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const 粗 = window.matchMedia("(pointer: coarse)").matches;
    if (減 || 粗) return;
    set用之(true);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x;
    let cy = y;
    let raf = 0;

    const 動 = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
    };
    const 幀 = () => {
      // 隨而不即 —— 追之以十分之一,故有拖曳之感。
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${cx - 16}px, ${cy - 16}px, 0)`;
      }
      raf = requestAnimationFrame(幀);
    };

    window.addEventListener("pointermove", 動, { passive: true });
    raf = requestAnimationFrame(幀);
    return () => {
      window.removeEventListener("pointermove", 動);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!用之) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9998] size-8 rounded-full bg-white mix-blend-difference"
    />
  );
}
