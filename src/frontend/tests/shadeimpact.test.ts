import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { route, nearestRoutableNode } from "../src/routing/astar";
import type { CityPack, ProfileFlags } from "../src/types";

const pack = JSON.parse(readFileSync(
  new URL("../public/city-packs/la.json", import.meta.url),
  "utf8")) as CityPack;

const HEAT: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: true,
};

function meanExposure(edges: { sun_exposure: number[] | null; length_m: number }[], h: number) {
  const tot = edges.reduce((s, e) => s + e.length_m, 0);
  return edges.reduce((s, e) => s + (e.sun_exposure?.[h] ?? 1) * e.length_m, 0) / tot;
}

describe("shade model changes routing at the hours that matter", () => {
  it("takes a cooler path at 14:00 in heat than the heat-blind baseline", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const a = nearestRoutableNode(pack, HEAT, minLon + 0.004, minLat + 0.004);
    const b = nearestRoutableNode(pack, HEAT, maxLon - 0.004, maxLat - 0.004);
    const H = 4; // 14:00

    const cool = route(pack, HEAT, a, b, H, 18)!;  // mild: heat term ~0
    const hot = route(pack, HEAT, a, b, H, 40)!;   // extreme heat

    const coolExp = meanExposure(cool.edges, H);
    const hotExp = meanExposure(hot.edges, H);
    console.log(
      `14:00  mild ${Math.round(cool.totalLength_m)}m exp=${coolExp.toFixed(3)}  |  ` +
      `hot ${Math.round(hot.totalLength_m)}m exp=${hotExp.toFixed(3)}  ` +
      `(${((hotExp - coolExp) / coolExp * 100).toFixed(1)}% exposure change, ` +
      `${(hot.totalLength_m - cool.totalLength_m).toFixed(0)}m detour)`,
    );
    // in extreme heat the router must accept a longer path for less sun
    expect(hotExp).toBeLessThan(coolExp);
    expect(hot.totalLength_m).toBeGreaterThan(cool.totalLength_m);
  });
});
