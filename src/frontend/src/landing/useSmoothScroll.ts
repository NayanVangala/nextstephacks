import { useEffect } from "react";
import Lenis from "lenis";

/**
 * 平捲。所法者 incredibles.dev —— 讀其站,得 Lenis 1.3.23,lerp 十分之一。
 *
 * 捲之所以「滑」,非由 CSS 之 scroll-behavior,乃由此:每幀取其真捲之位,
 * 以 lerp 趨於其的,故輪一動而其頁徐行,止亦徐止。
 *
 * Measured from the reference rather than guessed: it runs Lenis 1.3.23 with
 * lerp 0.1. This is what produces the "smooth" feeling — each frame eases the
 * real scroll position toward the target instead of jumping to it.
 *
 * ── 但施於 landing,不施於器 ──────────────────────────────────────────
 * 此為要事,非偏好。器之中有 Leaflet 之圖,其自有輪之義(縮放),
 * 又有滑桿、有長列。奪其輪而代以己之律,則圖不可縮,而人不知其何以然。
 * 且器為所用之物,非所觀之物:用者欲其即至,不欲其徐行。
 *
 * LANDING ONLY, and this is a correctness point rather than a taste one. The
 * app embeds a Leaflet map that binds the wheel to zoom, plus sliders and long
 * scrollable lists. Hijacking the wheel there would break map zoom with no
 * visible cause. A tool is operated, not admired: it should arrive where you
 * sent it immediately.
 *
 * ── 減動則全不起 ────────────────────────────────────────────────────
 * 平捲者,奪其人之捲而代之 —— 於暈動之人,此為害而非飾。
 * Smooth scrolling takes control of scrolling away from the user, which for
 * anyone with vestibular sensitivity is actively harmful. It never starts under
 * prefers-reduced-motion; the browser's own scrolling is left alone.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (
      typeof matchMedia !== "function" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      // 量於所法者。愈小則愈滑而愈遲;十分之一為其所取,亦為其常。
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      /*
        觸屏不奪。指之捲,系統自有其律(慣性、回彈),代之則手感立異,
        且與其平臺相違。所法者 syncTouch 亦為 false。
        Touch is left to the OS: its inertia and rubber-banding are platform
        behaviour, and overriding them makes the page feel wrong in the hand.
        The reference leaves syncTouch false too.
      */
      syncTouch: false,
      /*
        錨之鏈由 Lenis 主之,不然則 #what 之屬立至,與其餘之捲異其律。
        Anchor links routed through Lenis, otherwise #what would jump instantly
        while everything else eases — two scroll behaviours on one page.
      */
      anchors: true,
    });

    let raf = 0;
    const 幀 = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(幀);
    };
    raf = requestAnimationFrame(幀);

    return () => {
      cancelAnimationFrame(raf);
      /*
        必毀之。landing 去而其實例存,則 app 之捲猶為所主 ——
        而 app 正不當有此。
        MUST destroy: the landing unmounts when the user opens the tool, and a
        surviving instance would keep driving scroll inside the app, which is
        the one place this must not run.
      */
      lenis.destroy();
    };
  }, []);
}
