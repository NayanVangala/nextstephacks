import { describe, it, expect } from "vitest";
import { heatIndexNorm, edgeCost } from "../../src/frontend/src/routing/cost";
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
    sun_exposure: [0, 0, 0, 0, 0, 0, 0, 0], confidence: "high",
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
