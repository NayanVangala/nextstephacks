import { describe, it, expect } from "vitest";
import {
  reach, edgeHeatLoad, budgetFor, DEFAULT_BUDGETS,
} from "../src/routing/reach";
import type { CityPack, ProfileFlags, Edge } from "../src/types";

const NONE: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const HEAT: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: true,
};

function e(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [1], confidence: "high", near_rest_stop: false,
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

// chain: 1 -2- 2 -3- 3 -4- 4, each edge 100 m fully exposed
function chain(): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [
      { id: 1, lon: 0.0, lat: 0.0 }, { id: 2, lon: 0.001, lat: 0.0 },
      { id: 3, lon: 0.002, lat: 0.0 }, { id: 4, lon: 0.003, lat: 0.0 },
    ],
    edges: [e(10, 1, 2), e(11, 2, 3), e(12, 3, 4)],
    destinations: [],
  };
}

describe("edgeHeatLoad", () => {
  it("is zero in mild weather regardless of sun", () => {
    expect(edgeHeatLoad(e(1, 1, 2), 0, 18)).toBe(0);
  });

  it("scales with length, exposure, and heat", () => {
    const full = edgeHeatLoad(e(1, 1, 2), 0, 40);
    const half = edgeHeatLoad(e(1, 1, 2, { sun_exposure: [0.5] }), 0, 40);
    expect(full).toBeGreaterThan(half);
    expect(full).toBeCloseTo(100, 5); // 100 m x 1.0 exposure x 1.0 heat
  });

  it("is reduced on a rest-stop edge", () => {
    expect(edgeHeatLoad(e(1, 1, 2, { near_rest_stop: true }), 0, 40))
      .toBeLessThan(edgeHeatLoad(e(1, 1, 2), 0, 40));
  });
});

describe("budgetFor", () => {
  it("uses the baseline when no profile is active", () => {
    expect(budgetFor(NONE)).toBe(DEFAULT_BUDGETS.none);
  });

  it("takes the most conservative budget across active profiles", () => {
    const both: ProfileFlags = {
      wheelchair: true, blind_low_vision: false, heat_sensitive: true,
    };
    expect(budgetFor(both)).toBe(
      Math.min(DEFAULT_BUDGETS.wheelchair, DEFAULT_BUDGETS.heat_sensitive),
    );
  });
});

describe("reach", () => {
  it("reaches the whole component in mild weather", () => {
    const r = reach(chain(), NONE, 1, 0, 18, 250);
    expect(r.reachableNodes.size).toBe(4);
  });

  it("stops at the budget in extreme heat", () => {
    // 100 sun-metres per edge at 40C; a 250 budget clears two edges, not three
    const r = reach(chain(), HEAT, 1, 0, 40, 250);
    expect(r.reachableNodes.has(2)).toBe(true);
    expect(r.reachableNodes.has(3)).toBe(true);
    expect(r.reachableNodes.has(4)).toBe(false);
  });

  it("reports accumulated load per node", () => {
    const r = reach(chain(), HEAT, 1, 0, 40, 250);
    expect(r.loadByNode.get(1)).toBe(0);
    expect(r.loadByNode.get(2)).toBeCloseTo(100, 5);
    expect(r.loadByNode.get(3)).toBeCloseTo(200, 5);
  });

  it("returns only edges whose both ends are reachable", () => {
    const r = reach(chain(), HEAT, 1, 0, 40, 250);
    const ids = r.reachableEdges.map((x) => x.id).sort();
    expect(ids).toEqual([10, 11]);
  });

  it("respects profile traversability", () => {
    const p = chain();
    p.edges[1].traversable.wheelchair = false; // sever 2-3 for wheelchair
    const wc: ProfileFlags = {
      wheelchair: true, blind_low_vision: false, heat_sensitive: false,
    };
    const r = reach(p, wc, 1, 0, 18, 10_000);
    expect(r.reachableNodes.has(2)).toBe(true);
    expect(r.reachableNodes.has(3)).toBe(false);
  });

  it("a shaded detour can reach further than a short sunny path", () => {
    const p = chain();
    // add a long but fully shaded bypass 1 -> 5 -> 4
    p.nodes.push({ id: 5, lon: 0.0015, lat: 0.002 });
    p.edges.push(
      e(20, 1, 5, { length_m: 200, sun_exposure: [0] }),
      e(21, 5, 4, { length_m: 200, sun_exposure: [0] }),
    );
    const r = reach(p, HEAT, 1, 0, 40, 250);
    expect(r.reachableNodes.has(4)).toBe(true); // via the shaded pair, load 0
  });

  it("an unreachable start node yields an empty result", () => {
    const r = reach(chain(), HEAT, 999, 0, 40, 250);
    expect(r.reachableNodes.size).toBe(0);
  });
});

describe("reach 之所及,不得含不可通之段", () => {
  it("兩端雖可至,而其段不可通者,不入所及", () => {
    const p = chain();
    // 於 1、2 之間別置一階:兩端皆可至(由 10 之段),而階本身輪椅不可通
    p.edges.push(e(30, 1, 2, {
      is_steps: true,
      traversable: {
        wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
      },
    }));
    const wc: ProfileFlags = {
      wheelchair: true, blind_low_vision: false, heat_sensitive: false,
    };
    const r = reach(p, wc, 1, 0, 18, 10_000);
    expect(r.reachableNodes.has(1)).toBe(true);
    expect(r.reachableNodes.has(2)).toBe(true);
    // 階不得列於所及 —— 此輪椅之圖也
    expect(r.reachableEdges.map((x) => x.id)).not.toContain(30);
    expect(r.reachableEdges.map((x) => x.id)).toContain(10);
  });

  it("無 profile 則階仍可通,故仍在所及", () => {
    const p = chain();
    p.edges.push(e(30, 1, 2, { is_steps: true }));
    const r = reach(p, NONE, 1, 0, 18, 10_000);
    expect(r.reachableEdges.map((x) => x.id)).toContain(30);
  });
});
