import { describe, it, expect } from "vitest";
import { 熱陷, 造亂數 } from "../../src/frontend/src/report/熱陷";
import type { CityPack, ProfileFlags, Edge } from "../../src/frontend/src/types";

const 無: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};

function 造邊(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0], confidence: "high", near_rest_stop: false,
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

/**
 * 啞鈴之形:左三節相連,右三節相連,唯 3-4 一段通之。
 * 3-4 者,必經之橋也,其介數當最高。使之全曝,則當為熱陷之首。
 */
function 造啞鈴(): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [1, 2, 3, 4, 5, 6].map((id) => ({
      id, lon: 0.001 * id, lat: 0.0,
    })),
    edges: [
      造邊(10, 1, 2), 造邊(11, 2, 3), 造邊(12, 1, 3),
      造邊(13, 3, 4, { sun_exposure: [1] }),   // 橋,全曝
      造邊(14, 4, 5), 造邊(15, 5, 6), 造邊(16, 4, 6),
    ],
    destinations: [],
  };
}

describe("造亂數", () => {
  it("同種則同列,俾試可重", () => {
    const a = 造亂數(42);
    const b = 造亂數(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("異種則異列", () => {
    const a = 造亂數(1);
    const b = 造亂數(2);
    expect(a()).not.toEqual(b());
  });

  it("其值在零一之間", () => {
    const r = 造亂數(7);
    for (let i = 0; i < 50; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("熱陷", () => {
  it("必經而全曝之橋列於首", () => {
    const 出 = 熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 3, 種子: 42 });
    expect(出[0].edge.id).toBe(13);
  });

  it("全蔭之段其分為零", () => {
    const 出 = 熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 7, 種子: 42 });
    const 蔭者 = 出.filter((x) => x.edge.id !== 13);
    for (const x of 蔭者) expect(x.分).toBe(0);
  });

  it("取幾則回幾", () => {
    expect(熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 2, 種子: 42 })).toHaveLength(2);
  });

  it("其序自高而下", () => {
    const 出 = 熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 7, 種子: 42 });
    for (let i = 1; i < 出.length; i++) {
      expect(出[i - 1].分).toBeGreaterThanOrEqual(出[i].分);
    }
  });

  it("同種則同果", () => {
    const a = 熱陷(造啞鈴(), 無, 0, { 取樣數: 4, 取幾: 3, 種子: 9 });
    const b = 熱陷(造啞鈴(), 無, 0, { 取樣數: 4, 取幾: 3, 種子: 9 });
    expect(a.map((x) => x.edge.id)).toEqual(b.map((x) => x.edge.id));
  });

  it("網空則回空,不舉錯", () => {
    const p = 造啞鈴();
    p.edges = [];
    expect(熱陷(p, 無, 0, { 取樣數: 4, 取幾: 3, 種子: 1 })).toEqual([]);
  });

  it("曝闕者作全曝,故其分不為零", () => {
    const p = 造啞鈴();
    p.edges.forEach((e) => { e.sun_exposure = null; });
    const 出 = 熱陷(p, 無, 0, { 取樣數: 6, 取幾: 3, 種子: 42 });
    expect(出[0].曝).toBe(1);
  });
});
