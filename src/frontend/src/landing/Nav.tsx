import { useEffect, useState } from "react";

/**
 * 頂之navigation。
 *
 * The landing had no navigation of any kind — two buttons on a 4,320px page,
 * both saying the same thing. A visitor could not orient, could not jump, and
 * could not tell how long the page was. Persistent nav is the single most
 * conventional thing a page can have, and conventions are what let people stop
 * thinking about the interface and start reading it.
 *
 * 捲則其地漸實 —— 初則透,俾hero之字不為所奪。
 */
const 之節: { id: string; label: string }[] = [
  { id: "what", label: "What it is" },
  { id: "figures", label: "Figures" },
  { id: "does", label: "What it does" },
  { id: "found", label: "Findings" },
];

export function Nav({ onEnter }: { onEnter: () => void }) {
  const [實, set實] = useState(false);

  useEffect(() => {
    const 聽 = () => set實(scrollY > 80);
    聽();
    addEventListener("scroll", 聽, { passive: true });
    return () => removeEventListener("scroll", 聽);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        實 ? "bg-black/85 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <nav
        aria-label="Sections"
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"
      >
        <a
          href="#top"
          className="text-sm font-semibold uppercase tracking-wide transition-opacity duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-60"
        >
          Passable
        </a>

        {/* 小屏則但存其鈕 —— 四鏈於三百七十五像素之屏不可容,而摺疊之menu
            於此頁無所必需:全頁可捲,節皆相接。 */}
        <ul className="hidden items-center gap-7 md:flex">
          {之節.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-xs uppercase tracking-wide text-white/70 transition-opacity duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-white hover:opacity-100"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onEnter}
          className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase text-black transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:opacity-90"
        >
          Open the tool
        </button>
      </nav>
    </header>
  );
}
