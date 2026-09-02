import { useState } from "react";

/**
 * 曳桿之草稿。
 *
 * Radix 之 onValueChange 隨指之每動而發,非俟其釋 —— 故一曳之間,其值歷八格,
 * 而每格皆重算其路、重畫其網。紐約二萬九千段,乘八,皆在主緒之上:指未至而畫已滯。
 * 今其草存於此,示其籤者取草,而上報俟 onValueCommit(釋指、或鍵之一按)。
 * 所示者仍隨指而變,所算者一而已。
 *
 * Radix fires onValueChange on every pointermove step of a drag, not on
 * release, so dragging across all eight hour buckets re-ran A* and rebuilt
 * every polyline eight times — 29k polylines in New York, synchronously, per
 * drag. The label still tracks the finger off this draft; only the commit
 * reaches the expensive consumer.
 *
 * 外之值易則從之 —— 址之復、城之易、身之改皆自外而來,不可為草所掩。
 * MUST follow the prop: the hour is also set by URL restore, by a city change,
 * and by the profile default, and a stale draft would silently win over all
 * three. This is React's documented render-phase adjustment, not an effect.
 */
export function useSliderDraft(值: number, 上報: (v: number) => void) {
  const [草, set草] = useState(值);
  const [前, set前] = useState(值);
  if (前 !== 值) {
    set前(值);
    set草(值);
  }
  return {
    值: 草,
    onValueChange: ([v]: number[]) => set草(v),
    onValueCommit: ([v]: number[]) => 上報(v),
  };
}
