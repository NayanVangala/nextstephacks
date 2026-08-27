import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { nearestRoutableNode } from "../src/routing/astar";
import { reach, reachableDestinations, budgetFor } from "../src/routing/reach";
import type { CityPack, ProfileFlags } from "../src/types";

const pack = JSON.parse(readFileSync(
  new URL("../public/city-packs/la.json", import.meta.url),
  "utf8")) as CityPack;

const HEAT: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: true,
};

describe("reach on the real LA graph", () => {
  it("shrinks as the scenario worsens", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const start = nearestRoutableNode(pack, HEAT, (minLon + maxLon) / 2, (minLat + maxLat) / 2);
    const budget = budgetFor(HEAT);
    const H = 4; // 14:00

    const mild = reach(pack, HEAT, start, H, 20, budget);
    const advisory = reach(pack, HEAT, start, H, 38, budget);
    const extreme = reach(pack, HEAT, start, H, 44, budget);

    for (const [name, r] of [
      ["mild", mild], ["advisory", advisory], ["extreme", extreme],
    ] as const) {
      const cooling = reachableDestinations(pack, r).filter((d) => d.kind === "cooling_center");
      console.log(
        `${name.padEnd(9)} nodes=${r.reachableNodes.size.toString().padStart(6)}  ` +
        `cooling centres=${cooling.length}`,
      );
    }

    expect(mild.reachableNodes.size).toBeGreaterThan(advisory.reachableNodes.size);
    expect(advisory.reachableNodes.size).toBeGreaterThan(extreme.reachableNodes.size);
  });

  it("completes fast enough to feel instant", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const start = nearestRoutableNode(pack, HEAT, (minLon + maxLon) / 2, (minLat + maxLat) / 2);
    const t0 = performance.now();
    reach(pack, HEAT, start, 4, 44, budgetFor(HEAT));
    const ms = performance.now() - t0;
    console.log(`reach on 14.7k nodes: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});
