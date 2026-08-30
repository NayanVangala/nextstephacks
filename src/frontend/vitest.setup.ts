import { afterEach, vi } from "vitest";

/**
 * 諸測所共設。
 *
 * This file runs for EVERY test file, including the sixteen node-environment
 * ones that have no DOM at all. Nothing here may touch `document`, `window`, or
 * any DOM library at module scope — the jsdom-only wiring is loaded dynamically
 * behind a `typeof document` guard so the node suites stay fast and unbroken.
 */
if (typeof document !== "undefined") {
  // 副作用之引:自附其 matcher 於 expect。
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());

  // jsdom 無此二者,而 MapLibre 與 motion 皆賴之。
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as never;
  }
  /*
    jsdom 於此設無可用之 localStorage —— 其物存而其法不備
    (`localStorage.clear is not a function`)。凡驗所存之擇者皆賴之,
    故補一以 Map 為體者。其為真物之替,非其偽:存、取、去、清皆如其約。
    jsdom here exposes a localStorage that lacks its methods, so anything
    testing a persisted preference fails on the setup line rather than on the
    behaviour under test. This is a real Map-backed implementation of the
    Storage contract, not a spy.
  */
  if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
    const 存 = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => (存.has(k) ? 存.get(k)! : null),
        setItem: (k: string, v: string) => void 存.set(k, String(v)),
        removeItem: (k: string) => void 存.delete(k),
        clear: () => 存.clear(),
        key: (i: number) => [...存.keys()][i] ?? null,
        get length() {
          return 存.size;
        },
      },
    });
  }

  if (!globalThis.matchMedia) {
    globalThis.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as never;
  }
}

afterEach(() => vi.restoreAllMocks());
