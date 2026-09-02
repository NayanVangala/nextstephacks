import { useEffect, useRef, useState } from "react";

/**
 * 一線貫全頁,隨捲而長,其色隨曝之階自蔭而赤。
 *
 * The sections were islands: each revealed itself and then stopped, so scrolling
 * felt like paging rather than travelling. This is a route line — the same
 * object the app draws on the map — walking down the left edge of the page as
 * you read, shading from morning blue to midday red. It gives the page one
 * continuous spine and makes the act of scrolling feel like walking the thing
 * the site is about.
 *
 * 節之標記在其線上。過之則實,未至則虛 —— 人自知其所在。
 * The dots mark sections. Passing one fills it, so the line doubles as a
 * position indicator without adding a second piece of furniture.
 */
export function ScrollThread({ 節數 = 4 }: { 節數?: number }) {
  const [比, set比] = useState(0);
  const [用之, set用之] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 窄屏不置 —— 其側無餘地,反奪其文。
    const 寬 = matchMedia("(min-width: 1024px)");
    const 定 = () => set用之(寬.matches);
    定();
    寬.addEventListener("change", 定);
    return () => 寬.removeEventListener("change", 定);
  }, []);

  useEffect(() => {
    if (!用之) return;
    const 算 = () => {
      raf.current = 0;
      const 全 = document.documentElement.scrollHeight - innerHeight;
      set比(全 <= 0 ? 0 : Math.max(0, Math.min(1, scrollY / 全)));
    };
    const 聽 = () => {
      // 捲之事密,故以 rAF 節之 —— 每幀一算而已。
      if (!raf.current) raf.current = requestAnimationFrame(算);
    };
    算();
    addEventListener("scroll", 聽, { passive: true });
    addEventListener("resize", 聽);
    return () => {
      removeEventListener("scroll", 聽);
      removeEventListener("resize", 聽);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [用之]);

  if (!用之) return null;

  return (
    /*
      ── 何以去其 svg ────────────────────────────────────────────────────
      前此以 svg 為之,viewBox="0 0 24 100" 而 preserveAspectRatio="none",
      其匣廣二十四而高近九百 —— 故其橫不變,其縱九倍之。
      是以 r=3 之圓,實為廣六而高五十四之橢 —— 四白丸垂於頁左,
      正全屏最明之物,而其形非圓。凡 landing 之圖,無一無之。

      又其階之色取淡地之值(#1d4ed8/#a16207/#dc2626),施於 #090c13 之地,
      其明幾與其地等 —— 故所欲見者不見,而所不欲見者最明。

      The SVG had viewBox 24x100 with preserveAspectRatio="none" inside a
      24px-wide, ~900px-tall box: the y axis was scaled 9x and the x axis 1x, so
      every r=3 dot rendered as a 6x54px white lozenge. Four of them, down the
      left edge of every single landing screenshot, and the brightest objects on
      the page. The spine meanwhile used the LIGHT-theme ramp values, which on
      this ground are very nearly invisible — the hierarchy was exactly inverted.

      今以 div 為之:圓者恆圓,而其階從暗地之值。
    */
    <div
      aria-hidden
      className="pointer-events-none fixed left-6 top-0 z-30 hidden h-svh w-6 lg:block"
    >
      <div className="absolute inset-y-[6%] left-1/2 w-px -translate-x-1/2 bg-white/14" />
      <div
        className="absolute left-1/2 top-[6%] w-[2px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#4d9fff_0%,#f5b23c_50%,#ff5f4d_100%)] transition-[height] duration-300 ease-quint"
        style={{ height: `${88 * 比}%` }}
      />
      {Array.from({ length: 節數 }, (_, i) => {
        const 過 = 比 >= (i + 1) / (節數 + 1);
        return (
          <div
            key={i}
            className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-quint ${
              過 ? "size-2 bg-white" : "size-1.5 bg-white/30"
            }`}
            style={{ top: `${6 + (88 * (i + 1)) / (節數 + 1)}%` }}
          />
        );
      })}
    </div>
  );
}
