import { describe, it, expect } from "vitest";
import {
  route, buildAdjacency, nearestNode, nearestRoutableNode, largestComponent,
} from "../../src/frontend/src/routing/astar";
import { edgeCost } from "../../src/frontend/src/routing/cost";
import type { CityPack, ProfileFlags, Edge } from "../../src/frontend/src/types";

const NONE: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const WC: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: false,
};

function e(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0], near_rest_stop: false, confidence: "high",
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

// diamond: 1—2—4 (top) vs 1—3—4 (bottom); bottom edge 3—4 is steps
function pack(): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [
      { id: 1, lon: 0.0, lat: 0.0 }, { id: 2, lon: 0.0, lat: 0.001 },
      { id: 3, lon: 0.001, lat: 0.0 }, { id: 4, lon: 0.001, lat: 0.001 },
    ],
    edges: [
      e(10, 1, 2), e(11, 2, 4),
      e(12, 1, 3), e(13, 3, 4, {
        is_steps: true,
        traversable: {
          wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
        },
      }),
    ],
    destinations: [],
  };
}

describe("routing", () => {
  it("finds a path from 1 to 4", () => {
    const r = route(pack(), NONE, 1, 4, 0, 20);
    expect(r).not.toBeNull();
    expect(r!.nodeIds[0]).toBe(1);
    expect(r!.nodeIds.at(-1)).toBe(4);
  });

  it("wheelchair avoids the steps edge", () => {
    const r = route(pack(), WC, 1, 4, 0, 20);
    expect(r!.nodeIds).not.toContain(3); // must go via node 2
  });

  it("returns null when no traversable path exists", () => {
    const p = pack();
    // block both routes into node 4 for wheelchair
    p.edges[1].traversable.wheelchair = false; // 2—4
    const r = route(p, WC, 1, 4, 0, 20);
    expect(r).toBeNull();
  });

  it("nearestNode picks the closest coordinate", () => {
    expect(nearestNode(pack(), 0.0009, 0.0011)).toBe(4);
  });

  it("adjacency is bidirectional", () => {
    const adj = buildAdjacency(pack(), NONE);
    expect(adj.get(4)!.some((x) => x.to === 2 || x.from === 2)).toBe(true);
  });

  it("prefers the shaded branch when heat makes sun expensive", () => {
    const p = pack();
    // top branch (1-2-4) fully sunny, bottom (1-3-4) shaded; make bottom
    // wheelchair-passable so profile does not confound the comparison
    p.edges[0].sun_exposure = [1];
    p.edges[1].sun_exposure = [1];
    p.edges[2].sun_exposure = [0];
    p.edges[3].sun_exposure = [0];
    p.edges[3].is_steps = false;
    p.edges[3].traversable.wheelchair = true;
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    const r = route(p, hs, 1, 4, 0, 38);
    expect(r!.nodeIds).toContain(3);
  });

  it("largestComponent ignores a stranded fragment", () => {
    const p = pack();
    // add an island: nodes 90-91 joined to each other and nothing else
    p.nodes.push({ id: 90, lon: 5, lat: 5 }, { id: 91, lon: 5.001, lat: 5 });
    p.edges.push(e(90, 90, 91));
    const comp = largestComponent(buildAdjacency(p, NONE));
    expect(comp.has(1)).toBe(true);
    expect(comp.has(90)).toBe(false);
    expect(comp.size).toBe(4);
  });

  it("nearestRoutableNode refuses to snap onto a stranded fragment", () => {
    const p = pack();
    p.nodes.push({ id: 90, lon: 5, lat: 5 }, { id: 91, lon: 5.001, lat: 5 });
    p.edges.push(e(90, 90, 91));
    // a tap right on top of the island must still snap to the routable network
    const snapped = nearestRoutableNode(p, NONE, 5.0, 5.0);
    expect([90, 91]).not.toContain(snapped);
    expect(route(p, NONE, snapped, 4, 0, 20)).not.toBeNull();
  });

  it("plain nearestNode still returns the literally closest node", () => {
    const p = pack();
    p.nodes.push({ id: 90, lon: 5, lat: 5 });
    expect(nearestNode(p, 5.0, 5.0)).toBe(90);
  });

  it("largestComponent shrinks when a profile filters edges out", () => {
    const p = pack();
    // sever node 3/4's only wheelchair-passable link, stranding the bottom branch
    p.edges[2].traversable.wheelchair = false; // 1—3
    const wcComp = largestComponent(buildAdjacency(p, WC));
    const allComp = largestComponent(buildAdjacency(p, NONE));
    expect(wcComp.size).toBeLessThan(allComp.size);
  });

  it("returns the optimal cost, matching brute force over both branches", () => {
    const p = pack();
    p.edges[3].is_steps = false;
    p.edges[3].traversable.wheelchair = true;
    p.edges[0].sun_exposure = [1];
    p.edges[1].sun_exposure = [1];
    const r = route(p, NONE, 1, 4, 0, 38)!;
    // brute force: cost of the two candidate paths
    const top = edgeCost(p.edges[0], NONE, 0, 38) + edgeCost(p.edges[1], NONE, 0, 38);
    const bottom = edgeCost(p.edges[2], NONE, 0, 38) + edgeCost(p.edges[3], NONE, 0, 38);
    expect(r.totalCost).toBeCloseTo(Math.min(top, bottom), 6);
  });
});
