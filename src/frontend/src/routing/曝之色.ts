/**
 * 曝之色。蔭則青,午則黃,曝則赤。
 *
 * Shared so the strip and the per-step sparkline cannot drift apart. Two copies
 * of a colour ramp is two definitions of the same word, and a reader comparing
 * them would be comparing nothing.
 *
 * 色不獨任其義 —— 每處必有文字並之。WCAG: colour is never the only encoding.
 */
export type 曝之階 = "shade" | "midsun" | "fullsun";

/** 曝之階。色與文與 canvas 之實色,皆自此出 —— 其界不可三書。 */
export function 曝之階(曝: number): 曝之階 {
  return 曝 < 0.34 ? "shade" : 曝 < 0.67 ? "midsun" : "fullsun";
}

/**
 * 曝之色。用於 CSS 者。
 *
 * MUST NOT be used as a canvas fill or stroke: canvas cannot parse
 * `var(--x)` and silently paints black. The map runs Leaflet with
 * preferCanvas, which is why every sidewalk on it rendered black rather than
 * on the exposure ramp — see 曝之實色 in MapCanvas for the resolved form.
 */
export function 曝之色(曝: number): string {
  return `var(--color-${曝之階(曝)})`;
}

/** 曝之文。讀屏與色盲皆賴之。 */
export function 曝之文(曝: number): string {
  return 曝 < 0.34 ? "shade" : 曝 < 0.67 ? "partial sun" : "full sun";
}
