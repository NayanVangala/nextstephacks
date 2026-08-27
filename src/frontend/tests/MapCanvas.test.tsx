// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CityPack } from "../src/types";

/**
 * 圖之不可立者,不可使全物俱亡。
 *
 * This is the regression test for the defect that shipped to production and was
 * only found by accident during a design review: MapLibre's constructor raises
 * GPUInitializationError when WebGL2 is absent, nothing caught it, and the
 * exception unwound through React's commit phase and unmounted the ENTIRE app.
 * The user saw a blank white page. The map's own aria-label promises "the same
 * route is available as a text itinerary below" — and that itinerary was exactly
 * what disappeared.
 *
 * jsdom has no WebGL at all, so it reproduces the broken environment for free.
 * That is why these tests are worth more than their line count suggests: the
 * default test environment IS the failure condition.
 */

const 假囊 = {
  manifest: {
    id: "la",
    name: "Los Angeles",
    bbox: [-118.27, 34.03, -118.23, 34.06],
    hour_buckets: [6, 8, 10, 12, 14, 16, 18, 20],
  },
  nodes: [],
  edges: [],
  destinations: [],
} as unknown as CityPack;

const 無身 = { wheelchair: false, blind_low_vision: false, heat_sensitive: false };

async function 載MapCanvas() {
  // 可為圖() 記其所問於 module 之內,故每試必重載,否則前試之答留而汙後試。
  // 可為圖() memoizes its answer in module scope, so every test must reset the
  // module registry or the first test's verdict leaks into the rest.
  vi.resetModules();
  const m = await import("../src/components/MapCanvas");
  return m.MapCanvas;
}

function 立圖(MapCanvas: Awaited<ReturnType<typeof 載MapCanvas>>) {
  return render(
    <MapCanvas
      pack={假囊}
      flags={無身}
      hourIdx={4}
      route={null}
      origin={null}
      dest={null}
      onPick={() => {}}
    />,
  );
}

describe("MapCanvas 無 WebGL2 之時", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("不擲,不使其樹俱卸 —— 白頁乃此物之所最不可為者", async () => {
    const MapCanvas = await 載MapCanvas();
    expect(() => 立圖(MapCanvas)).not.toThrow();
  });

  it("代之以一告,且指其可用者何在", async () => {
    const MapCanvas = await 載MapCanvas();
    立圖(MapCanvas);

    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText(/map cannot be drawn/i)).toBeInTheDocument();
    // 但言其敗而不告所以繼者,則棄人於中途。
    expect(screen.getByText(/text itinerary below/i)).toBeInTheDocument();
    expect(screen.getByText(/by name above/i)).toBeInTheDocument();
  });

  it("不留 maplibre 之 canvas 於頁", async () => {
    const MapCanvas = await 載MapCanvas();
    const { container } = 立圖(MapCanvas);
    expect(container.querySelector("canvas.maplibregl-canvas")).toBeNull();
  });

  it("不冒稱其為 application —— 讀屏之人不當被引入一無所有之器", async () => {
    const MapCanvas = await 載MapCanvas();
    立圖(MapCanvas);
    expect(screen.queryByRole("application")).toBeNull();
  });
});

describe("可為圖", () => {
  it("無 webgl2 則否", async () => {
    vi.resetModules();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { 可為圖 } = await import("../src/components/圖之能");
    expect(可為圖()).toBe(false);
  });

  it("有 webgl2 則然", async () => {
    vi.resetModules();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      ((種: string) => (種 === "webgl2" ? ({} as never) : null)) as never,
    );
    const { 可為圖 } = await import("../src/components/圖之能");
    expect(可為圖()).toBe(true);
  });

  it("getContext 自擲者,亦以為否,不使其誤上達", async () => {
    vi.resetModules();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("此機不備 canvas");
    });
    const { 可為圖 } = await import("../src/components/圖之能");
    expect(可為圖()).toBe(false);
  });

  it("一問而記之,不屢立 canvas", async () => {
    vi.resetModules();
    const 諜 = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);
    const { 可為圖 } = await import("../src/components/圖之能");
    可為圖();
    可為圖();
    可為圖();
    expect(諜).toHaveBeenCalledTimes(1);
  });
});
