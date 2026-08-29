import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
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

export const 微曲 = [0.4, 0, 0.2, 1] as const;
export const 巨曲 = [0.3, 1, 0.7, 1] as const;

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
