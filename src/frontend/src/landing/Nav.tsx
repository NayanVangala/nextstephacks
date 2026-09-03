import { Fragment, useEffect, useState } from "react";
import { SignIn } from "../auth/SignIn";

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
export interface 節之目 {
  href: string;
  label: string;
}

/* landing 之節。說之頁自授其目 —— 彼無此諸錨,若仍指之則墜於 landing。 */
const 之節: 節之目[] = [
  { href: "#what", label: "What it is" },
  { href: "#figures", label: "Figures" },
  { href: "#does", label: "What it does" },
  { href: "#found", label: "Findings" },
  { href: "#/help", label: "How to use it" },
];

/**
 * 一目所屬之頁。
 *
 * 錨之目(#what)不出當頁,故其名為空 —— 凡空者皆同頁。頁之目(#/help)則各異。
 * 二目相鄰而其頁異,乃以點隔之:同頁之節相從,異頁之鏈相斷。
 * A dot marks a jump to a different page; section anchors within the current
 * page run together without one.
 */
function 頁之名(href: string): string {
  return href.startsWith("#/") ? href.slice(2).split(/[?#]/)[0] : "";
}

export function Nav({
  onEnter,
  節 = 之節,
}: {
  onEnter: () => void;
  節?: 節之目[];
}) {
  const [實, set實] = useState(false);

  useEffect(() => {
    const 聽 = () => set實(scrollY > 80);
    聽();
    addEventListener("scroll", 聽, { passive: true });
    return () => removeEventListener("scroll", 聽);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ease-quint ${
        // 必書其籤,不書其值 —— index.css 之「MUST reference the token」正為此。
        // 其地既深為 #090c13,而此猶書 #0e1116,則捲過之後此帶淡於其頁。
        實 ? "bg-canvas/85 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <nav
        aria-label="Sections"
        className="grid-container flex items-center justify-between py-4"
      >
        <a
          href="#top"
          className="landing-label font-medium transition-opacity duration-150 ease-quint hover:opacity-60"
        >
          Passable
        </a>

        {/* 小屏則但存其鈕 —— 五鏈於七六八之屏亦不可容(量之,逾其地),
            而摺疊之menu於此頁無所必需:全頁可捲,節皆相接。 */}
        <ul className="hidden items-center gap-7 lg:flex">
          {節.map((s, i) => (
            <Fragment key={s.href}>
              {i > 0 && 頁之名(節[i - 1].href) !== 頁之名(s.href) && (
                <li aria-hidden className="-mx-3 text-ink/30">
                  ·
                </li>
              )}
              <li>
                <a
                  href={s.href}
                  className="landing-label text-ink/70 transition-colors hover:text-ink"
                >
                  {s.label}
                </a>
              </li>
            </Fragment>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {/* 無供給則此全不見 —— 壞鈕劣於無鈕。 */}
          <div className="hidden lg:block">
            <SignIn 暗 />
          </div>
          <button
            type="button"
            onClick={onEnter}
            className="landing-label rounded-full bg-ink px-5 py-2.5 font-medium text-canvas transition-[opacity,scale] duration-150 ease-quint hover:scale-105 hover:opacity-90"
          >
            Open the tool
          </button>
        </div>
      </nav>
    </header>
  );
}
