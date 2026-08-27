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
