/**
 * 動之常數。二曲三時,取於 Palomino:微動用「曲微」,大動用「曲巨」。
 *
 * 所動者惟 transform 與 opacity。二者行於 compositor,不觸 layout,
 * 故羸弱之機但失幀,不致全頁之滯。
 */
export const 曲微 = [0.4, 0, 0.2, 1] as const;
export const 曲巨 = [0.3, 1, 0.7, 1] as const;

export const 時微 = 0.22;
export const 時中 = 0.42;
export const 時巨 = 0.6;

/**
 * IMPORTANT: this check must be made in JavaScript, not left to CSS.
 *
 * The `prefers-reduced-motion` block in index.css neutralises CSS animations and
 * transitions, but Motion drives the Web Animations API directly and that block
 * does not reach WAAPI at all. Every animate() call in this app must be guarded
 * by this function. Forgetting it fails silently: the animation still runs, and
 * only a user who needs it stopped will ever see the bug.
 */
export function 減動(): boolean {
  return typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 安動:動而必終。此為此模組之要,凡動皆由之。
 *
 * Motion's animations are driven by the browser's animation clock, which Chrome
 * PAUSES while the document is hidden. An animation that starts and then stalls
 * leaves its element frozen part-way — measured in this app at opacity 0.44,
 * with the entire view translucent and no event that would ever finish it. The
 * animation reports playState "running" the whole time, so nothing looks wrong.
 *
 * This wrapper closes the hole three ways, in order:
 *   1. It refuses to start at all while the document is hidden or the user has
 *      asked for reduced motion, leaving the element in its natural state.
 *   2. It completes immediately if the page becomes hidden mid-flight.
 *   3. It completes on a timer sized to the animation, as a final net.
 *
 * Every animate() call in this app must go through here. A bare animate() call
 * is a bug even when it appears to work, because it only fails for users who
 * background the tab — which is nobody during development.
 */
export function 安動(
  的: HTMLElement[],
  起: () => { complete: () => void; stop: () => void },
  全時毫秒: number,
): () => void {
  const 淨 = () => {
    for (const el of 的) {
      el.style.opacity = "";
      el.style.transform = "";
    }
  };

  // 不動之時亦淨之。動之不起,則元素本自可見;然若前番之動有遺,此可掃之。
  // 淨 is called here, not merely returned, so that "安動 never leaves an element
  // translucent" holds unconditionally rather than only on the animated path.
  if (減動() || document.hidden) {
    淨();
    return 淨;
  }

  const 控 = 起();
  const 終 = () => {
    try {
      控.complete();
    } catch {
      // 已終則無事。
    }
    // 保底之保底。Motion's complete() was measured NOT to commit while the
    // animation clock is frozen: the element stayed at opacity 0.44 with its
    // WAAPI animation still reporting playState "running". Finishing the
    // underlying animations directly does commit, so do that too rather than
    // trusting the library to have landed it.
    for (const el of 的) {
      for (const a of el.getAnimations()) {
        try {
          a.finish();
        } catch {
          // 不可終者(無限之動)置之。
        }
      }
      el.style.opacity = "";
      el.style.transform = "";
    }
  };
  const 隱則終 = () => {
    if (document.hidden) 終();
  };

  document.addEventListener("visibilitychange", 隱則終);
  const 保底 = window.setTimeout(終, 全時毫秒 + 400);

  return () => {
    document.removeEventListener("visibilitychange", 隱則終);
    clearTimeout(保底);
    控.stop();
    淨();
  };
}
