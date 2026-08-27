import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "motion";
import { 曲巨, 時中, 安動 } from "./预设";

/**
 * 入場之動:自下而升,由淡而顯。有「選」則動其子,依序而起。
 *
 * The hidden starting state is written by the animation itself, never by a
 * stylesheet or a className. If the animation never runs — reduced motion, a
 * background tab, a thrown error — the element is already in its natural,
 * visible state. An app for disabled users must not be able to leave its own
 * content invisible, and the landing page shipped exactly that bug once by
 * starting elements at opacity 0 in CSS and waiting on an observer that never
 * fired in a hidden tab.
 *
 * Runs in a layout effect so the visible-then-hidden flash never reaches paint.
 * All timing guarantees live in 安動 — see its comment before changing this.
 */
export function useEnter<T extends HTMLElement = HTMLDivElement>({
  選,
  位移 = 14,
  間 = 0.055,
  延 = 0,
  憑 = "",
}: {
  選?: string;
  位移?: number;
  間?: number;
  延?: number;
  /** 憑改則重動之。切換 view、易城、易身,皆宜重動。 */
  憑?: string | number;
} = {}) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const 根 = ref.current;
    if (!根) return;

    const 的 = 選 ? [...根.querySelectorAll<HTMLElement>(選)] : [根];
    if (的.length === 0) return;

    return 安動(
      的,
      () =>
        animate(
          的,
          { opacity: [0, 1], y: [位移, 0] },
          {
            duration: 時中,
            ease: 曲巨,
            delay: 選 ? stagger(間, { startDelay: 延 }) : 延,
          },
        ),
      (時中 + 延 + 間 * 的.length) * 1000,
    );
  }, [選, 位移, 間, 延, 憑]);

  return ref;
}
