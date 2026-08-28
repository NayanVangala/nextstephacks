/**
 * 曝之色。蔭則青,午則黃,曝則赤。
 *
 * Shared so the strip and the per-step sparkline cannot drift apart. Two copies
 * of a colour ramp is two definitions of the same word, and a reader comparing
 * them would be comparing nothing.
 *
 * 色不獨任其義 —— 每處必有文字並之。WCAG: colour is never the only encoding.
 */
export function 曝之色(曝: number): string {
  return 曝 < 0.34
    ? "var(--color-shade)"
    : 曝 < 0.67
      ? "var(--color-midsun)"
      : "var(--color-fullsun)";
}

/** 曝之文。讀屏與色盲皆賴之。 */
export function 曝之文(曝: number): string {
  return 曝 < 0.34 ? "shade" : 曝 < 0.67 ? "partial sun" : "full sun";
}
