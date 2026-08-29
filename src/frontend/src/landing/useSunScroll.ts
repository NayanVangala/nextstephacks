import { useEffect, useRef } from "react";
import { 曝之rgb } from "./useNet";

/**
 * 捲即時。頁之所歷,即一日之所歷。
 *
 * ── 何以為此 ─────────────────────────────────────────────────────────
 * 中諸節本皆一律:一標、一題、一文、一格,皆左齊,皆同其升入之動,皆同其節奏。
 * 其病不在動之寡,在其無變 —— 四節如一節,故讀之若一節之四覆。
 *
 * 散施異效於各節,則其病反甚:此頁遂為效之集,而非一物。
 * 故不散施,而立一事貫其全:捲之所至,即日之所至。
 * 凡界、凡標之畫、凡數之上緣,皆隨之自蔭之青,歷午之黃,而至暮之赤。
 * 至其末「NOW WALK IT」,則全頁已熱。
 *
 * The middle sections were uniform: same layout, same fade-up, same rhythm, so
 * four sections read as one section repeated. Scattering a different effect
 * across each would have made it worse — a collection of effects rather than
 * one page. So there is a single device instead, and it carries the product's
 * own variable: scrolling the page IS moving through the day. Every rule and
 * label mark walks the exposure ramp from shade-blue to full-sun red.
 *
 * ── 其實作 ───────────────────────────────────────────────────────────
 * 一 CSS 變數而已,rAF 節之。不改其文之色 —— 但改其界與其記,
 * 故對比不為所動,無論其捲之所在。
 * ONE custom property, rAF-throttled. It only ever touches rules and marks,
 * never body text, so no amount of scrolling can move a contrast ratio.
 *
 * JS 不行,則其變數存其常(白),而頁如其舊 —— 此為飾,不可以其敗累其文。
 * If this never runs the variable keeps its CSS default and the page renders
 * exactly as it did before. Decoration must not be load-bearing.
 *
 * 減動者取其午 —— 一值而定,不隨捲而變。
 * Reduced motion pins it at midday rather than animating.
 */
export function useSunScroll(靶: React.RefObject<HTMLElement | null>) {
  const raf = useRef(0);

  useEffect(() => {
    const el = 靶.current;
    if (!el) return;

    const 書 = (曝: number) => {
      const [r, g, b] = 曝之rgb(曝);
      el.style.setProperty("--sun", `${r} ${g} ${b}`);
    };

    if (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      書(0.5);
      return;
    }

    const 算 = () => {
      raf.current = 0;
      const 全 = document.documentElement.scrollHeight - innerHeight;
      /*
        零至一,而非零至一之全程 —— 頂已為青,底已為赤,則其中無所歷。
        故實用者三分之二,首尾各留其餘,俾其變在人所讀之處。
        The usable range is squeezed to 0.08-0.92 so the colour is still visibly
        travelling while the reader is in the middle sections, rather than having
        already saturated at both ends where nobody is looking.
      */
      const p = 全 <= 0 ? 0 : Math.max(0, Math.min(1, scrollY / 全));
      書(Math.max(0, Math.min(1, (p - 0.08) / 0.84)));
    };

    const 聽 = () => {
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
  }, [靶]);
}
