import { useEffect, useState } from "react";

/**
 * landing 之網:洛城真實之人行道,九百段,已歸一於零至一。
 *
 * Not decoration standing in for the product — this IS the product's data, at
 * 59 KB. A landing page for a routing tool that illustrated itself with stock
 * photography would be describing something it declined to show.
 *
 * 取之而不得,則其效不起,而頁如常。動之於此為錦上之花,非其所賴。
 * Failure is silent by design: the canvas simply never starts and the page reads
 * exactly as it does without JavaScript. A decorative layer must never be able
 * to take the content with it.
 */

/** [x1, y1, x2, y2, 八時之曝, 輪椅可通乎] */
export type 一段 = [number, number, number, number, number[], number];

export interface 網 {
  hours: number[];
  edges: 一段[];
}

export function useNet(): 網 | null {
  const [網, set網] = useState<網 | null>(null);
  useEffect(() => {
    let 棄 = false;
    fetch(`${import.meta.env.BASE_URL}landing-net.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!棄 && d && Array.isArray(d.edges)) set網(d as 網);
      })
      .catch(() => {
        // 靜默。此為裝飾,不可以其敗累其文。
      });
    return () => {
      棄 = true;
    };
  }, []);
  return 網;
}

/** 動之當否。減動之人、粗指之屏,皆不起。 */
export function 可動(): boolean {
  if (typeof matchMedia !== "function") return false;
  return (
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !matchMedia("(pointer: coarse)").matches
  );
}

/** 曝之色,與 app 同階。此處用 rgb 之值 —— canvas 不解 CSS 之變數。 */
export function 曝之rgb(曝: number): [number, number, number] {
  /*
    蔭 #5b9bff -> 午 #e2a63c -> 曝 #ff6b5b。此暗地之階,非淡地之階。
    前此取淡地之值(#1d4ed8 等),而 landing 恆黑 —— 其藍於黑地對比一點六,
    故晨時之網幾不可見,而人但見其午與其暮。所失者正其半日。
    These are the DARK-ground ramp values. The light-theme ones were used here,
    but this canvas only ever draws on black: #1d4ed8 on #000 is 1.6:1, so the
    morning half of the sweep was very nearly invisible — losing exactly the
    contrast the animation exists to show.
  */
  const 階: [number, [number, number, number]][] = [
    [0, [91, 155, 255]],
    [0.5, [226, 166, 60]],
    [1, [255, 107, 91]],
  ];
  const t = Math.max(0, Math.min(1, 曝));
  for (let i = 1; i < 階.length; i++) {
    const [p0, c0] = 階[i - 1];
    const [p1, c1] = 階[i];
    if (t <= p1) {
      const k = (t - p0) / (p1 - p0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return 階[階.length - 1][1];
}
