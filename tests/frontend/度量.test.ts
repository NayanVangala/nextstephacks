import { describe, it, expect } from "vitest";
import {
  可通之率, 蔭之率, 無階可至者, 信之分佈, 斷之率,
} from "../../src/frontend/src/report/度量";
import type { CityPack, ProfileFlags, Edge, Destination } from "../../src/frontend/src/types";

const 無: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const 輪椅: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: false,
};

function 造邊(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
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

// 四節成鏈:1-2-3-4。2-3 之段為階,輪椅不可通。
function 造囊(dests: Destination[] = []): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [
      { id: 1, lon: 0.0, lat: 0.0 }, { id: 2, lon: 0.001, lat: 0.0 },
      { id: 3, lon: 0.002, lat: 0.0 }, { id: 4, lon: 0.003, lat: 0.0 },
    ],
    edges: [
      造邊(10, 1, 2, { sun_exposure: [0.1] }),
      造邊(11, 2, 3, {
        is_steps: true, confidence: "medium",
        traversable: {
          wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
        },
      }),
      造邊(12, 3, 4, { sun_exposure: [0.9], confidence: "low" }),
    ],
    destinations: dests,
  };
}

describe("可通之率", () => {
  it("無 profile 則全網可通", () => {
    const r = 可通之率(造囊(), 無);
    expect(r.率).toBeCloseTo(1, 6);
    expect(r.總米).toBeCloseTo(300, 6);
  });

  it("輪椅則階之段不計", () => {
    const r = 可通之率(造囊(), 輪椅);
    expect(r.可通米).toBeCloseTo(200, 6);
    expect(r.率).toBeCloseTo(2 / 3, 6);
  });
});

describe("蔭之率", () => {
  it("但計可通之段", () => {
    // 輪椅可通者為 10(曝0.1,蔭)與 12(曝0.9,曝)
    const r = 蔭之率(造囊(), 輪椅, 0, 0.5);
    expect(r.可通米).toBeCloseTo(200, 6);
    expect(r.蔭米).toBeCloseTo(100, 6);
    expect(r.率).toBeCloseTo(0.5, 6);
  });

  it("曝闕者作全曝,不作蔭", () => {
    const p = 造囊();
    p.edges.forEach((e) => { e.sun_exposure = null; });
    expect(蔭之率(p, 無, 0, 0.5).蔭米).toBe(0);
  });
});

describe("無階可至者", () => {
  const 所 = (lon: number, lat: number, node_id: number | null): Destination => ({
    id: "d", name: "Library", lon, lat, kind: "cooling_center",
    backup_power: "unknown", source: "s", node_id,
  });

  it("近於可通之節者不列", () => {
    const p = 造囊([所(0.0, 0.0, 1)]);
    expect(無階可至者(p, 輪椅, 400)).toHaveLength(0);
  });

  it("其節在輪椅不可及之分支者列之", () => {
    // 節 3、4 於輪椅而言已與 1、2 斷,故置所於 4 之側
    const p = 造囊([所(0.003, 0.0, 4)]);
    const 出 = 無階可至者(p, 輪椅, 50);
    expect(出).toHaveLength(1);
  });

  it("雖在同分支而距逾半徑者亦列之", () => {
    const p = 造囊([所(0.5, 0.5, 1)]);  // 去節甚遠
    expect(無階可至者(p, 無, 400)).toHaveLength(1);
  });

  it("節之id為null者列之", () => {
    const p = 造囊([所(0.0, 0.0, null)]);
    // 雖 node_id 為 null,其經緯猶在,故仍以距判之
    expect(無階可至者(p, 無, 400)).toHaveLength(0);
  });
});

describe("信之分佈", () => {
  it("按段之數與米分之", () => {
    const r = 信之分佈(造囊());
    expect(r.high.數).toBe(1);
    expect(r.medium.數).toBe(1);
    expect(r.low.數).toBe(1);
    expect(r.high.米).toBeCloseTo(100, 6);
  });
});

describe("斷之率", () => {
  it("無 profile 則無所斷", () => {
    const r = 斷之率(造囊(), 無);
    expect(r.斷之節).toBe(0);
    expect(r.率).toBeCloseTo(0, 6);
  });

  it("階斷其網,則輪椅之所及少於眾人", () => {
    // 鏈 1-2-3-4,而 2-3 為階:輪椅但得 1、2
    const r = 斷之率(造囊(), 輪椅);
    expect(r.眾人之節).toBe(4);
    expect(r.此身之節).toBe(2);
    expect(r.斷之節).toBe(2);
    expect(r.率).toBeCloseTo(0.5, 6);
  });

  it("網空則回零而不舉錯", () => {
    const p = 造囊();
    p.edges = [];
    expect(斷之率(p, 輪椅).率).toBe(0);
  });
});

function 地(over: Partial<Destination>): Destination {
  return {
    id: "d", name: "A place", lon: 0, lat: 0, kind: "cooling_center",
    backup_power: "unknown", source: "s", node_id: 1, ...over,
  };
}

describe("無階可至者 之格網,其果當與力搜同", () => {
  it("格網與力搜,所得無異", () => {
    const 多: Destination[] = [];
    for (let i = 0; i < 40; i++) {
      多.push(地({
        id: `d${i}`,
        lon: (i % 8) * 0.0005,
        lat: Math.floor(i / 8) * 0.0005,
        node_id: 1,
      }));
    }
    const p = 造囊(多);
    // 半徑遞增,格網之果當恆與力搜同
    for (const r of [10, 50, 120, 400, 2000]) {
      const 得 = 無階可至者(p, 無, r).map((x) => x.id).sort();
      const 力 = 多.filter((d) => {
        let m = Infinity;
        for (const n of p.nodes) {
          const dx = (d.lon - n.lon) * 111320 * Math.cos((n.lat * Math.PI) / 180);
          const dy = (d.lat - n.lat) * 111320;
          m = Math.min(m, Math.hypot(dx, dy));
        }
        return m > r;
      }).map((x) => x.id).sort();
      expect(得).toEqual(力);
    }
  });

  it("節空則諸所皆為無階可至", () => {
    const p = 造囊([地({ id: "x", lon: 0, lat: 0, node_id: 1 })]);
    p.edges = [];
    expect(無階可至者(p, 無, 400)).toHaveLength(1);
  });
});
