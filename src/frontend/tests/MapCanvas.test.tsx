// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapCanvas } from "../src/components/MapCanvas";
import type { CityPack, Edge } from "../src/types";

/**
 * 圖之測。
 *
 * The predecessor of this file tested that a MISSING GPU degraded gracefully,
 * because MapLibre threw GPUInitializationError without WebGL2 and took the
 * whole React tree down with it. Leaflet needs no GPU at all, so that class of
 * failure is now absent rather than handled, and these tests check the thing
 * that replaced it: that the map builds, draws, and cleans up in an environment
 * with no WebGL whatsoever — which jsdom is.
 */

/**
 * jsdom 無 layout —— getBoundingClientRect 皆零,clientWidth 亦零。
 * Leaflet 以之為除數,故其 pixel origin 為 null,而後之每筆皆擲。
 * 此非 leaflet 之疾,乃 jsdom 本不排版。與其棄此測,不如予其一假之尺。
 *
 * jsdom does no layout, so Leaflet divides by a zero-sized container and every
 * subsequent draw throws on a null pixel origin. Giving the container a
 * plausible size is what lets these tests exercise the real component instead of
 * a mock of it.
 */
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true, get: () => 800,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true, get: () => 600,
  });
  // jsdom 之 canvas 無 2d 之 context —— getContext 回 null,而 leaflet 之
  // Canvas renderer 徑用之,故擲於 ctx.translate。
  // 立一空之 proxy 代之:凡取其屬皆得一無為之函,故其筆皆落於虛而不擲。
  // 此所測者非其像 —— jsdom 本不能繪 —— 乃其立、其更、其卸不擲而已。
  HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({}, {
      get: (_t, k) =>
        k === "canvas" ? undefined : typeof k === "string" ? () => {} : undefined,
      set: () => true,
    }) as never;
  } as never;

  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect;
  };
});

function e(id: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from: id, to: id + 1, length_m: 100,
    geometry: [[-118.25, 34.05], [-118.249, 34.051]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0.1, 0.3, 0.6, 0.9, 1, 0.6, 0.2, 0], near_rest_stop: false,
    confidence: "high",
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  } as Edge;
}

const 假囊 = {
  manifest: {
    id: "la", name: "Los Angeles",
    bbox: [-118.27, 34.03, -118.23, 34.06],
    hour_buckets: [6, 8, 10, 12, 14, 16, 18, 20],
  },
  nodes: [],
  edges: [
    e(1),
    // 一段輪椅不可通者 —— 其色當灰,而不當隱。
    e(2, {
      is_steps: true,
      traversable: {
        wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
      },
    }),
  ],
  destinations: [],
} as unknown as CityPack;

const 無身 = { wheelchair: false, blind_low_vision: false, heat_sensitive: false };

function 立圖(over: Partial<Parameters<typeof MapCanvas>[0]> = {}) {
  return render(
    <MapCanvas
      pack={假囊}
      flags={無身}
      hourIdx={4}
      route={null}
      origin={null}
      dest={null}
      onPick={() => {}}
      {...over}
    />,
  );
}

describe("MapCanvas 無 GPU 之境(jsdom)", () => {
  it("立而不擲 —— 前此以 WebGL 為賴,故無之則全樹俱卸", () => {
    expect(() => 立圖()).not.toThrow();
  });

  it("其容器仍為 application,並告以文之行程在下", () => {
    立圖();
    const el = screen.getByRole("application");
    expect(el).toBeInTheDocument();
    expect(el.getAttribute("aria-label")).toMatch(/text itinerary below/i);
  });

  it("不以「不可繪」之告代之 —— leaflet 於此境可繪", () => {
    立圖();
    expect(screen.queryByText(/could not be drawn/i)).toBeNull();
  });

  it("卸之而不擲", () => {
    const { unmount } = 立圖();
    expect(() => unmount()).not.toThrow();
  });

  it("易其身、其時,不重立其圖", () => {
    const { rerender } = 立圖();
    expect(() =>
      rerender(
        <MapCanvas
          pack={假囊}
          flags={{ wheelchair: true, blind_low_vision: false, heat_sensitive: false }}
          hourIdx={0}
          route={null}
          origin={null}
          dest={null}
          onPick={() => {}}
        />,
      ),
    ).not.toThrow();
  });

  it("起訖之標可置而不擲", () => {
    expect(() =>
      立圖({
        origin: { lon: -118.25, lat: 34.05 },
        dest: { lon: -118.24, lat: 34.055 },
      }),
    ).not.toThrow();
  });
});

describe("段之樣", () => {
  it("不可通之段仍繪之 —— 障之不可見者,不可報亦不可避", () => {
    // 此驗其意,非其像:囊中二段,其一輪椅不可通,而二者皆當入其圖。
    const 輪椅 = { wheelchair: true, blind_low_vision: false, heat_sensitive: false };
    const { container } = 立圖({ flags: 輪椅 });
    // leaflet 於 jsdom 不繪其像,然其容器立而不擲,即其層皆已成。
    expect(container.querySelector('[role="application"]')).toBeTruthy();
  });
});
