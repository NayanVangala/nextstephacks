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
    <div
      aria-hidden
      className="pointer-events-none fixed left-6 top-0 z-30 hidden h-svh w-6 lg:block"
    >
      <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="size-full">
        <defs>
          {/* 曝之階。蔭而午而暮 —— 與 app 之帶同語。 */}
          <linearGradient id="thread" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#a16207" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <line x1="12" y1="6" x2="12" y2="94" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <line
          x1="12"
          y1="6"
          x2="12"
          y2={6 + 88 * 比}
          stroke="url(#thread)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {Array.from({ length: 節數 }, (_, i) => {
          const y = 6 + (88 * (i + 1)) / (節數 + 1);
          const 過 = 比 >= (i + 1) / (節數 + 1);
          return (
            <circle
              key={i}
              cx="12"
              cy={y}
              r={過 ? 3 : 2}
              fill={過 ? "#fff" : "rgba(255,255,255,0.28)"}
              className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            />
          );
        })}
      </svg>
    </div>
  );
}
