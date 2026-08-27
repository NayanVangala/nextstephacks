/**
 * 此機能為圖否。
 *
 * Do NOT rely on try/catch around MapLibre's Map constructor to answer this.
 * MapLibre surfaces its GPUInitializationError asynchronously, so the
 * constructor still RETURNS a half-built Map: the catch never fires, effect
 * cleanup gets registered, and the later m.remove() dereferences a painter that
 * was never created — which unmounts the whole React tree.
 *
 * 一問而記之。每呼皆立 canvas,則屢問屢費。
 */
let 記: boolean | null = null;

export function 可為圖(): boolean {
  if (記 !== null) return 記;
  try {
    const c = document.createElement("canvas");
    記 = Boolean(c.getContext("webgl2"));
  } catch {
    記 = false;
  }
  return 記;
}
