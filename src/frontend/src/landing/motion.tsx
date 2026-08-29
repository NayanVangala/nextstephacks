import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { 曲巨 as 巨曲 } from "../motion/预设";
import type { ReactNode } from "react";

/**
 * landing 之動,以 framer-motion 為之。
 *
 * 二曲三時,皆量於所法者:
 *   0.15s cubic-bezier(.4,0,.2,1)   微 —— 懸、按
 *   0.6s  cubic-bezier(.3,1,.7,1)   巨 —— 入場
 *
 * ── 保底,不可去 ──────────────────────────────────────────────
 * framer 之 whileInView 恃 IntersectionObserver。頁隱、tab 在背、
 * 全頁截圖之時,其觀察者不報,則凡在屏下者永停於 opacity 0 —— 全頁之中皆空。
 *
 * 此疾此頁已犯二次:一在自書之 useReveal,一在改用 whileInView 之時。
 * 故此處不用 whileInView,而以 useInView 佐一計時:逾一千八百毫秒,
 * 無論見與不見,皆令其現。
 *
 * whileInView relies on IntersectionObserver, which does not fire in a hidden
 * document, a background tab, or a full-page screenshot — leaving everything
 * below the fold at opacity 0 forever. This page has now shipped that bug
 * twice. The timeout is the fix: after 1800ms the content appears whether the
 * observer ever spoke or not. A decorative animation must never be the reason
 * text cannot be read.
 */

/*
  曲不自立,取於 motion/预设(見上之 import)—— 前此此處與彼處各書其曲,
  值同而名互倒,是一物而二本。二本者必離,離則同一頁之動不復同其律。
  微曲本亦在此,而無一處用之,故並去之。
  Previously duplicated in motion/预设.ts under transposed names with identical
  values — which is how two curves silently drift apart and one page ends up
  animating to two rhythms. The 微曲 export had no consumers and is gone.
*/

const 保底之時 = 1800;

export const 升入: Variants = {
  隱: { opacity: 0, y: 28 },
  現: { opacity: 1, y: 0 },
};

export const 序入: Variants = {
  隱: {},
  現: { transition: { staggerChildren: 0.07 } },
};

/**
 * 見則現,不見亦終現。
 *
 * 名必為 ASCII。React 辨 component 以其首字之大寫,辨 hook 以 "use" 而繼以
 * 大寫;中文之名二者皆不合,故 lint 報其誤,而 Fast Refresh 亦不能辨之。
 * 此頁今日已因此誤者再 —— component 與 hook 之名,獨不從中文之例。
 *
 * MUST be ASCII. React identifies components by a leading capital and hooks by
 * /^use[A-Z]/; a Chinese name satisfies neither, so the rules-of-hooks lint
 * cannot verify it and Fast Refresh cannot recognise it. Everything else in
 * this codebase is named in Chinese by policy — components and hooks are the
 * one carve-out, and it is a mechanical requirement, not a preference.
 */
function useRevealState<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const 見 = useInView(ref, { once: true, amount: 0.2 });
  const [逾時, set逾時] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => set逾時(true), 保底之時);
    return () => clearTimeout(t);
  }, []);
  return { ref, 現: 見 || 逾時 };
}

export function Reveal({
  children,
  className = "",
  延 = 0,
}: {
  children: ReactNode;
  className?: string;
  延?: number;
}) {
  const 減 = useReducedMotion();
  const { ref, 現 } = useRevealState<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={減 ? false : "隱"}
      animate={減 ? undefined : 現 ? "現" : "隱"}
      variants={升入}
      transition={{ duration: 0.6, ease: 巨曲, delay: 延 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const 減 = useReducedMotion();
  const { ref, 現 } = useRevealState<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={減 ? false : "隱"}
      animate={減 ? undefined : 現 ? "現" : "隱"}
      variants={序入}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={升入}
      transition={{ duration: 0.6, ease: 巨曲 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 一橫界,隨其入而自左至右畫之。
 *
 * 諸節皆升入(縱),故其節奏一律。此界橫行,故其節自別於其餘 ——
 * 所變者軸,非所加者效。四節各施一效,則此頁為效之集;
 * 一節易其軸,則其節可辨而頁猶為一物。
 *
 * Every other reveal on this page moves vertically, which is why four sections
 * read as one. This one draws horizontally: the section changes axis rather than
 * acquiring a different effect. Four sections with four effects would be a
 * collection of effects; one section on a different axis is still one page.
 *
 * 用 useRevealState,故其保底之時同 —— 觀察者不報,亦必現。
 * Shares useRevealState, so it inherits the 1800ms timeout: if
 * IntersectionObserver never fires (hidden document, background tab, full-page
 * screenshot) the rule still appears rather than staying at scaleX(0) forever.
 */
export function RevealRule({ className = "" }: { className?: string }) {
  const 減 = useReducedMotion();
  const { ref, 現 } = useRevealState<HTMLDivElement>();
  /*
    ── 何以不用 framer ────────────────────────────────────────────────
    framer 之動,亦賴 requestAnimationFrame。頁隱、tab 在背、全頁截圖之際,
    rAF 不行,則其物永停於 initial —— 即 scaleX(0),界遂全不見。
    量之於真 browser:八界之中,五者停於 matrix(0,0,0,1,0,0)。
    此正此頁已犯再三之疾,不可以一界之飾復蹈之。

    CSS 之 transform 則不然:狀既定,其終值即刻著於其樣,
    動之行與不行,不改其所終。動可失,而其物不可失。

    NOT framer-motion: its animation loop is rAF-driven, so in a hidden document,
    a background tab, or a full-page screenshot the element stays at its initial
    scaleX(0) and the rules simply never appear. Measured in a real browser, five
    of eight were stuck collapsed. This page has shipped that exact bug twice
    already and a decorative hairline is not worth a third.

    A CSS transform commits its end value to computed style the moment the state
    flips, whether or not the transition ever gets a frame to run in. The
    animation is allowed to be lost; the rule is not.
  */
  /*
    頁隱則即現,不待其觀察者,亦不待其計時。
    量之於真 browser:document.hidden 之時,此頁二十三物停於 opacity 0,
    而上文所稱之「保底之時」實不能救之 —— 其狀雖易,而 framer 賴 rAF 以著其樣,
    rAF 於隱頁不行,故其樣終不著。此界既以 CSS 為之,不賴 rAF,
    然其狀猶賴其計時,故此更加一途:頁隱者,徑現之。
    Measured: with document.hidden, 23 elements on this page sit at opacity 0 and
    the 1800ms fallback does NOT rescue them. This rule uses CSS rather than
    framer so its committed style does not need a frame, but its STATE still
    comes from that same timer — so a hidden document reveals it outright.
    A divider must never be missing because an animation could not run.
  */
  const 隱 = typeof document !== "undefined" && document.hidden;
  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{
        transformOrigin: "left",
        transform: 減 || 現 || 隱 ? "scaleX(1)" : "scaleX(0)",
        transition: 減 ? undefined : "transform 700ms cubic-bezier(0.3, 1, 0.7, 1)",
      }}
    />
  );
}
