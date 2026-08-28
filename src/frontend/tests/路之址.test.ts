import { describe, it, expect } from "vitest";
import { 解址, 成址, 驗其節, 記身 } from "../src/data/路之址";
import type { CityPack, ProfileFlags } from "../src/types";

/**
 * 址者,此物唯一之不可信之入也。
 *
 * The URL hash is the only untrusted input this app accepts. Everything else
 * comes from a schema-validated city pack or from the user's own clicks. These
 * tests exist because a shared link is the ONE url a judge will actually open,
 * and a stale or hostile one must fail visibly rather than resolve to a route
 * nobody chose.
 */

const 無身: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const 輪椅: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: true,
};

function 造囊(ids: number[]): CityPack {
  return {
    manifest: { hour_buckets: [6, 8, 10, 12, 14, 16, 18, 20] },
    nodes: ids.map((id) => ({ id, lon: 0, lat: 0 })),
    edges: [],
    destinations: [],
  } as unknown as CityPack;
}

describe("解址", () => {
  it("無 query 者,其狀皆空", () => {
    const s = 解址("#/app");
    expect(s.origin).toBeNull();
    expect(s.dest).toBeNull();
    expect(s.flags).toBeNull();
    expect(s.hourIdx).toBeNull();
  });

  it("解其城、其view、其節、其身、其時", () => {
    const s = 解址("#/app?c=sea&v=reach&o=123&d=456&p=101&h=6");
    expect(s.city).toBe("sea");
    expect(s.view).toBe("reach");
    expect(s.origin).toBe(123);
    expect(s.dest).toBe(456);
    expect(s.flags).toEqual({
      wheelchair: true, blind_low_vision: false, heat_sensitive: true,
    });
    expect(s.hourIdx).toBe(6);
  });

  it("節之號非純數者棄之 —— Number('12abc') 為 NaN,Number('') 為零,二者皆不可為節", () => {
    for (const bad of ["12abc", "", "1.5", "-3", "0x10", " 7", "1e3"]) {
      expect(解址(`#/app?o=${encodeURIComponent(bad)}`).origin).toBeNull();
    }
  });

  it("身之記非三字零一者棄之", () => {
    for (const bad of ["1", "1111", "abc", "12", "10", ""]) {
      expect(解址(`#/app?p=${bad}`).flags).toBeNull();
    }
    expect(解址("#/app?p=000").flags).toEqual(無身);
  });

  it("時之序逾界者棄之 —— 界面以此索 sun_exposure,逾則靜取全曝而人不覺", () => {
    expect(解址("#/app?h=99").hourIdx).toBeNull();
    expect(解址("#/app?h=24").hourIdx).toBeNull();
    expect(解址("#/app?h=0").hourIdx).toBe(0);
  });

  it("址雖亂,不擲", () => {
    for (const bad of ["#/app?", "#/app?&&&", "#/app?=", "#/app?%%%", "#"]) {
      expect(() => 解址(bad)).not.toThrow();
    }
  });
});

describe("成址 與 解址 相反", () => {
  it("所書者可復解之", () => {
    const h = 成址({
      city: "phx", view: "route", origin: 42, dest: 99,
      flags: 輪椅, hourIdx: 4,
    });
    const s = 解址(h);
    expect(s.city).toBe("phx");
    expect(s.origin).toBe(42);
    expect(s.dest).toBe(99);
    expect(s.flags).toEqual(輪椅);
    expect(s.hourIdx).toBe(4);
  });

  it("節未擇者不入其址", () => {
    const h = 成址({
      city: "la", view: "route", origin: null, dest: null,
      flags: 無身, hourIdx: 0,
    });
    expect(h).not.toContain("o=");
    expect(h).not.toContain("d=");
  });

  it("記身之次序為輪椅、盲、畏暑", () => {
    expect(記身({ wheelchair: true, blind_low_vision: false, heat_sensitive: false })).toBe("100");
    expect(記身({ wheelchair: false, blind_low_vision: true, heat_sensitive: false })).toBe("010");
    expect(記身({ wheelchair: false, blind_low_vision: false, heat_sensitive: true })).toBe("001");
  });
});

describe("驗其節", () => {
  const 囊 = 造囊([1, 2, 3]);

  it("節在囊中者存之", () => {
    const r = 驗其節(囊, 1, 3);
    expect(r.origin).toBe(1);
    expect(r.dest).toBe(3);
    expect(r.失之節).toEqual([]);
  });

  it("節不在囊中者去之,而記其失 —— 不可就近而代之", () => {
    const r = 驗其節(囊, 999, 2);
    expect(r.origin).toBeNull();
    expect(r.dest).toBe(2);
    // 就近取代則示人以其所未擇之路,而屏上無一字言其已易。
    expect(r.失之節).toEqual([999]);
  });

  it("二節皆失,則二者皆記", () => {
    expect(驗其節(囊, 998, 999).失之節).toEqual([998, 999]);
  });

  it("本無節者,非失也", () => {
    expect(驗其節(囊, null, null).失之節).toEqual([]);
  });
});
