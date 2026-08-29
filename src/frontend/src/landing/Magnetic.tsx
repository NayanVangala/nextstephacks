import { useEffect, useRef, type ReactNode } from "react";

/**
 * 磁。鼠近則其物趨之,去則歸位。
 *
 * 所法者於其鈕用之。此效之所以動人者,在其「未點而已應」——
 * 手方近而物已迎之,故人覺其活,非覺其快。
 *
 * The effect works because the element answers before you click it: the cursor
 * approaches and the thing leans toward you. That is what reads as "alive"
 * rather than merely "fast".
 *
 * ── 其位不改,但移其影 ──────────────────────────────────────────────
 * 所動者惟 transform。故其命中之域不隨之而移 —— 目所見者已趨,
 * 而其可點之地仍在其本位。鼠既在其域中,二者不相離,故無礙。
 * transform 行於 compositor,不觸 layout,亦不使其鄰重排。
 * Only transform moves, so the hit area stays where layout put it. Since the
 * pointer is inside that area whenever the pull is active, the two never
 * disagree. Transform also stays on the compositor and cannot reflow neighbours.
 *
 * ── 粗指與減動皆不起 ────────────────────────────────────────────────
 * 觸屏無「近」之義 —— 指至即點,無所謂趨。故不聽其事,亦省其算。
 * Coarse pointers have no notion of "near": a finger arrives already touching,
 * so there is nothing to approach and the listener is never attached.
 */
export function Magnetic({
  children,
  /** 其力。一為全趨於鼠,零為不動。 */
  力 = 0.32,
  /** 其域,以其身之半徑為度。 */
  域 = 2.2,
  className = "",
}: {
  children: ReactNode;
  力?: number;
  域?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof matchMedia !== "function") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    let 的x = 0;
    let 的y = 0;

    const 動 = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const 半 = Math.max(r.width, r.height) / 2;
      const 距 = Math.hypot(dx, dy);
      if (距 < 半 * 域) {
        // 愈近愈趨。其外則歸零,不作跳。
        const 衰 = 1 - 距 / (半 * 域);
        的x = dx * 力 * 衰;
        的y = dy * 力 * 衰;
      } else {
        的x = 0;
        的y = 0;
      }
      if (!raf) raf = requestAnimationFrame(趨);
    };

    const 趨 = () => {
      raf = 0;
      // 隨而不即 —— 直取其的則其動如閃,趨之則如磁。
      x += (的x - x) * 0.18;
      y += (的y - y) * 0.18;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(的x - x) > 0.1 || Math.abs(的y - y) > 0.1) {
        raf = requestAnimationFrame(趨);
      } else if (的x === 0 && 的y === 0) {
        // 既歸,則去其 transform,不留其樣。
        el.style.transform = "";
      }
    };

    addEventListener("pointermove", 動, { passive: true });
    return () => {
      removeEventListener("pointermove", 動);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [力, 域]);

  return (
    <span ref={ref} className={`inline-block will-change-transform ${className}`}>
      {children}
    </span>
  );
}
