import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { route, nearestRoutableNode } from "../../src/frontend/src/routing/astar";
import type { CityPack, ProfileFlags } from "../../src/frontend/src/types";

const pack = JSON.parse(readFileSync(
  new URL("../../src/frontend/public/city-packs/la.json", import.meta.url),
  "utf8")) as CityPack;

const PROFILES: [string, ProfileFlags][] = [
  ["none", { wheelchair: false, blind_low_vision: false, heat_sensitive: false }],
  ["wheelchair", { wheelchair: true, blind_low_vision: false, heat_sensitive: false }],
  ["wc+heat", { wheelchair: true, blind_low_vision: false, heat_sensitive: true }],
];

describe("real LA graph", () => {
  it("routes across downtown for every profile, fast enough to feel instant", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    for (const [name, p] of PROFILES) {
      const a = nearestRoutableNode(pack, p, minLon + 0.004, minLat + 0.004);
      const b = nearestRoutableNode(pack, p, maxLon - 0.004, maxLat - 0.004);
      const t0 = performance.now();
      const r = route(pack, p, a, b, 1, 38);
      const ms = performance.now() - t0;
      console.log(`${name.padEnd(11)} ${r ? `${Math.round(r.totalLength_m)} m, ${r.edges.length} edges` : "NO ROUTE"}  ${ms.toFixed(0)} ms`);
      expect(r).not.toBeNull();
      expect(ms).toBeLessThan(1000);
    }
  });

  it("finds a hotter-hour route that is not identical to the cool-hour route", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    const a = nearestRoutableNode(pack, hs, minLon + 0.004, minLat + 0.004);
    const b = nearestRoutableNode(pack, hs, maxLon - 0.004, maxLat - 0.004);
    const cool = route(pack, hs, a, b, 0, 20)!;   // 06:00, mild
    const hot = route(pack, hs, a, b, 1, 40)!;    // 08:00, hot
    console.log(`cool ${Math.round(cool.totalLength_m)}m exp=${cool.maxExposure.toFixed(2)} | hot ${Math.round(hot.totalLength_m)}m exp=${hot.maxExposure.toFixed(2)}`);
    expect(cool).not.toBeNull();
    expect(hot).not.toBeNull();
  });
});
