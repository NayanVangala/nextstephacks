import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { 安動 } from "../../src/frontend/src/motion/预设";

/**
 * 安動之約有三,此驗之。
 *
 * These tests exist because the bug they cover shipped once and was invisible in
 * development: an entrance animation started, the tab went to the background,
 * the browser froze the animation clock, and the whole view stayed at opacity
 * 0.44 forever while its animation still reported playState "running". Nothing
 * threw, nothing logged, and the only affected users were the ones who opened
 * the app in a background tab.
 *
 * 无 DOM 之庫,故自造其偽 —— 安動所需者少,偽之足矣。
 */

interface 偽動 {
  finished: boolean;
  cancelled: boolean;
  finish(): void;
}

interface 偽元 {
  style: { opacity: string; transform: string };
  動: 偽動[];
  getAnimations(): 偽動[];
}

function 造元(): 偽元 {
  const 動: 偽動[] = [
    { finished: false, cancelled: false, finish() { this.finished = true; } },
  ];
  return {
    style: { opacity: "0", transform: "translateY(14px)" },
    動,
    getAnimations: () => 動,
  };
}

let 聽者: Array<() => void>;
let 隱: boolean;
let 減: boolean;
let 表: Array<{ fn: () => void; ms: number; 已清: boolean }>;

beforeEach(() => {
  聽者 = [];
  隱 = false;
  減 = false;
  表 = [];
  (globalThis as Record<string, unknown>).matchMedia = (q: string) => ({
    matches: q.includes("reduced-motion") ? 減 : false,
  });
  (globalThis as Record<string, unknown>).document = {
    get hidden() { return 隱; },
    addEventListener: (_t: string, fn: () => void) => 聽者.push(fn),
    removeEventListener: (_t: string, fn: () => void) => {
      聽者 = 聽者.filter((x) => x !== fn);
    },
  };
  (globalThis as Record<string, unknown>).window = {
    setTimeout: (fn: () => void, ms: number) => {
      表.push({ fn, ms, 已清: false });
      return 表.length - 1;
    },
  };
  (globalThis as Record<string, unknown>).clearTimeout = (id: number) => {
    if (表[id]) 表[id].已清 = true;
  };
});

afterEach(() => {
  for (const k of ["matchMedia", "document", "window", "clearTimeout"]) {
    delete (globalThis as Record<string, unknown>)[k];
  }
});

function 造控() {
  const 記 = { 終次: 0, 止次: 0 };
  return {
    記,
    控: {
      complete: () => { 記.終次 += 1; },
      stop: () => { 記.止次 += 1; },
    },
  };
}

describe("安動", () => {
  it("減動之人,則全不動,且元素歸其本狀", () => {
    減 = true;
    const el = 造元();
    let 起過 = false;
    const { 控 } = 造控();
    安動([el] as never, () => { 起過 = true; return 控; }, 1000);
    expect(起過).toBe(false);
    expect(el.style.opacity).toBe("");
    expect(el.style.transform).toBe("");
  });

  it("頁既隱,則不起動 —— 動之鐘已停,起之必凝於半途", () => {
    隱 = true;
    const el = 造元();
    let 起過 = false;
    const { 控 } = 造控();
    安動([el] as never, () => { 起過 = true; return 控; }, 1000);
    expect(起過).toBe(false);
    expect(el.style.opacity).toBe("");
  });

  it("動之中而頁隱,則立終之,不留半透之文", () => {
    const el = 造元();
    const { 記, 控 } = 造控();
    安動([el] as never, () => 控, 1000);

    // 動既起,元素之 style 未經安動所改 —— 動自主之。
    expect(記.終次).toBe(0);
    expect(聽者.length).toBe(1);

    隱 = true;
    for (const fn of 聽者) fn();

    expect(記.終次).toBe(1);
    // Motion's own complete() was measured not to commit while the clock is
    // frozen, so the underlying animations must be finished directly too.
    expect(el.動[0].finished).toBe(true);
    expect(el.style.opacity).toBe("");
    expect(el.style.transform).toBe("");
  });

  it("頁未隱而聽者鳴,則不終 —— 顯而復顯,動當自行", () => {
    const el = 造元();
    const { 記, 控 } = 造控();
    安動([el] as never, () => 控, 1000);
    for (const fn of 聽者) fn();
    expect(記.終次).toBe(0);
    expect(el.動[0].finished).toBe(false);
  });

  it("保底之時至,則終之。其時必逾動之全時", () => {
    const el = 造元();
    const { 記, 控 } = 造控();
    安動([el] as never, () => 控, 1000);

    expect(表.length).toBe(1);
    expect(表[0].ms).toBeGreaterThan(1000);

    表[0].fn();
    expect(記.終次).toBe(1);
    expect(el.動[0].finished).toBe(true);
  });

  it("清之,則止其動、去其聽、清其時,並歸元素之本狀", () => {
    const el = 造元();
    const { 記, 控 } = 造控();
    const 清 = 安動([el] as never, () => 控, 1000);

    清();

    expect(記.止次).toBe(1);
    expect(聽者.length).toBe(0);
    expect(表[0].已清).toBe(true);
    expect(el.style.opacity).toBe("");
    expect(el.style.transform).toBe("");
  });

  it("動不可終者,不以其誤而廢餘元素", () => {
    const 壞 = 造元();
    壞.動[0].finish = () => { throw new Error("无限之动不可终"); };
    const 好 = 造元();
    const { 控 } = 造控();
    安動([壞, 好] as never, () => 控, 1000);

    隱 = true;
    for (const fn of 聽者) fn();

    expect(好.動[0].finished).toBe(true);
    expect(好.style.opacity).toBe("");
    expect(壞.style.opacity).toBe("");
  });
});
