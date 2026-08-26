import { describe, it, expect } from "vitest";
import { heatIndexNorm, edgeCost, effectiveExposure } from "../../src/frontend/src/routing/cost";
import type { Edge, ProfileFlags } from "../../src/frontend/src/types";

const NONE: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};

function edge(over: Partial<Edge> = {}): Edge {
  return {
    id: 1, from: 1, to: 2, length_m: 100, geometry: [[0, 0], [0, 1]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0, 0, 0, 0, 0, 0, 0, 0], near_rest_stop: false, confidence: "high",
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

describe("heatIndexNorm", () => {
  it("clamps below 25C to 0 and above 40C to 1", () => {
    expect(heatIndexNorm(20)).toBe(0);
    expect(heatIndexNorm(40)).toBe(1);
    expect(heatIndexNorm(32.5)).toBeCloseTo(0.5, 3);
  });
});

describe("edgeCost", () => {
  it("equals length when cool and shaded and no profile", () => {
    expect(edgeCost(edge(), NONE, 4, 20)).toBeCloseTo(100, 5);
  });

  it("heat-sensitive pays more for a sunny edge in heat than baseline", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    expect(edgeCost(sunny, hs, 4, 38)).toBeGreaterThan(edgeCost(sunny, NONE, 4, 38));
  });

  it("adds a slope penalty above 3% for wheelchair", () => {
    const hill = edge({ incline_pct: 6 });
    const wc: ProfileFlags = {
      wheelchair: true, blind_low_vision: false, heat_sensitive: false,
    };
    expect(edgeCost(hill, wc, 4, 20)).toBeGreaterThan(edgeCost(edge(), wc, 4, 20));
  });

  it("penalizes an unsignalized crossing for a blind pedestrian", () => {
    const x = edge({ is_crossing: true, crossing_signalized: false });
    const bl: ProfileFlags = {
      wheelchair: false, blind_low_vision: true, heat_sensitive: false,
    };
    expect(edgeCost(x, bl, 4, 20)).toBeGreaterThan(edgeCost(edge(), bl, 4, 20));
  });

  it("never returns less than the raw length, so the A* heuristic stays admissible", () => {
    const cases: Edge[] = [
      edge(),
      edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] }),
      edge({ incline_pct: 7, surface: "asphalt" }),
      edge({ is_crossing: true, crossing_signalized: true }),
    ];
    const profiles: ProfileFlags[] = [
      NONE,
      { wheelchair: true, blind_low_vision: false, heat_sensitive: false },
      { wheelchair: true, blind_low_vision: true, heat_sensitive: true },
    ];
    for (const e of cases) {
      for (const p of profiles) {
        expect(edgeCost(e, p, 4, 38)).toBeGreaterThanOrEqual(e.length_m);
      }
    }
  });

  it("treats a missing sun_exposure array as unshaded-unknown, not as shade", () => {
    const unknown = edge({ sun_exposure: null });
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    // must not be cheaper than a known-shaded edge of the same length
    expect(edgeCost(unknown, hs, 4, 38)).toBeGreaterThanOrEqual(
      edgeCost(edge(), hs, 4, 38),
    );
  });
});

describe("rest-stop exposure relief", () => {
  it("reduces effective exposure on a rest-stop edge", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const withRest = edge({
      sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: true,
    });
    expect(effectiveExposure(withRest, 4)).toBeLessThan(effectiveExposure(sunny, 4));
  });

  it("never drives exposure below zero", () => {
    const shaded = edge({ sun_exposure: [0, 0, 0, 0, 0, 0, 0, 0], near_rest_stop: true });
    expect(effectiveExposure(shaded, 4)).toBeGreaterThanOrEqual(0);
  });

  it("treats a missing exposure array as fully exposed even with a rest stop", () => {
    const unknown = edge({ sun_exposure: null, near_rest_stop: true });
    expect(effectiveExposure(unknown, 4)).toBeGreaterThan(0.5);
  });

  it("makes a rest-stop edge cheaper in heat without breaking the length floor", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const withRest = edge({
      sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: true,
    });
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    expect(edgeCost(withRest, hs, 4, 40)).toBeLessThan(edgeCost(sunny, hs, 4, 40));
    expect(edgeCost(withRest, hs, 4, 40)).toBeGreaterThanOrEqual(withRest.length_m);
  });

  it("changes nothing when it is not hot", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const withRest = edge({
      sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: true,
    });
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    expect(edgeCost(withRest, hs, 4, 18)).toBeCloseTo(edgeCost(sunny, hs, 4, 18), 6);
  });
});

describe("报事之罚", () => {
  it("有报之段其值增", () => {
    const e = edge();
    const 罰 = new Map([[e.id, 300]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeGreaterThan(edgeCost(e, NONE, 4, 20));
  });

  it("无报之段不受累", () => {
    const e = edge();
    const 罰 = new Map([[999, 300]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeCloseTo(edgeCost(e, NONE, 4, 20), 6);
  });

  it("虽有报,其值犹不小于其长 —— 不变式不破", () => {
    const e = edge();
    const 罰 = new Map([[e.id, 300]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeGreaterThanOrEqual(e.length_m);
  });

  it("不授罚则如故", () => {
    const e = edge();
    expect(edgeCost(e, NONE, 4, 20, undefined)).toBeCloseTo(edgeCost(e, NONE, 4, 20), 6);
  });

  it("罚为负者不採 —— 减值则启发式不可容", () => {
    const e = edge();
    const 罰 = new Map([[e.id, -500]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeGreaterThanOrEqual(e.length_m);
  });
});
