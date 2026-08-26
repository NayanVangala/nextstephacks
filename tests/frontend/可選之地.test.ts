import { describe, it, expect } from "vitest";
import { 可選之地 } from "../../src/frontend/src/report/可選之地";
import type { CityPack, Destination } from "../../src/frontend/src/types";

function 地(over: Partial<Destination>): Destination {
  return {
    id: "d", name: "A place", lon: 0, lat: 0, kind: "cooling_center",
    backup_power: "unknown", source: "s", node_id: 1, ...over,
  };
}

function 造囊(dests: Destination[]): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [], edges: [], destinations: dests,
  };
}

describe("可選之地", () => {
  it("繫於節者方可選 —— 無節則不可route", () => {
    const p = 造囊([
      地({ id: "a", name: "Has node", node_id: 5 }),
      地({ id: "b", name: "No node", node_id: null }),
    ]);
    const 出 = 可選之地(p).flatMap((g) => g.地);
    expect(出.map((x) => x.id)).toEqual(["a"]);
  });

  it("以類分群", () => {
    const p = 造囊([
      地({ id: "a", kind: "cooling_center", name: "Library" }),
      地({ id: "b", kind: "transit_stop", name: "Union Station" }),
    ]);
    const 群 = 可選之地(p);
    expect(群.map((g) => g.類)).toContain("cooling_center");
    expect(群.map((g) => g.類)).toContain("transit_stop");
  });

  it("無名之憩息處不列 —— 四百餘「Bench」掩其要", () => {
    const p = 造囊([
      地({ id: "a", kind: "rest_stop", name: "Bench" }),
      地({ id: "b", kind: "rest_stop", name: "Drinking fountain" }),
      地({ id: "c", kind: "rest_stop", name: "Grand Park" }),
    ]);
    const 出 = 可選之地(p).flatMap((g) => g.地);
    expect(出.map((x) => x.name)).toEqual(["Grand Park"]);
  });

  it("納涼避難之所雖名泛亦列之 —— 其要故也", () => {
    const p = 造囊([地({ id: "a", kind: "cooling_center", name: "Shelter" })]);
    expect(可選之地(p).flatMap((g) => g.地)).toHaveLength(1);
  });

  it("群內以名序之", () => {
    const p = 造囊([
      地({ id: "a", name: "Zoo", kind: "cooling_center" }),
      地({ id: "b", name: "Aquarium", kind: "cooling_center" }),
    ]);
    const 群 = 可選之地(p)[0];
    expect(群.地.map((x) => x.name)).toEqual(["Aquarium", "Zoo"]);
  });

  it("同名同節者去其重", () => {
    const p = 造囊([
      地({ id: "a", name: "Union Station", kind: "transit_stop", node_id: 7 }),
      地({ id: "b", name: "Union Station", kind: "transit_stop", node_id: 7 }),
    ]);
    expect(可選之地(p).flatMap((g) => g.地)).toHaveLength(1);
  });

  it("囊空則回空而不舉錯", () => {
    expect(可選之地(造囊([]))).toEqual([]);
  });
});
