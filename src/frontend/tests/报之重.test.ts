import { describe, it, expect } from "vitest";
import { 衰, 一报之重, 段之罰, 罰之表, 段之狀, 基之重, 半衰之日, 幾時之前 } from "../src/data/报之重";
import type { 报 } from "../src/data/本地庫";

const 今 = Date.parse("2026-08-28T12:00:00Z");
const 日 = 86_400_000;

function r(over: Partial<报> = {}): 报 {
  return {
    id: Math.random().toString(36).slice(2), city_id: "la", edge_id: 7,
    kind: "sidewalk_blocked", note: null, status: "unverified",
    created_at: new Date(今).toISOString(), ...over,
  };
}

describe("衰", () => {
  it("今之报不衰", () => {
    expect(衰(r(), 今)).toBeCloseTo(1, 6);
  });

  it("半衰之日,其重減半", () => {
    const 舊 = r({ created_at: new Date(今 - 半衰之日 * 日).toISOString() });
    expect(衰(舊, 今)).toBeCloseTo(0.5, 3);
  });

  it("倍其期則四分之一", () => {
    const 舊 = r({ created_at: new Date(今 - 2 * 半衰之日 * 日).toISOString() });
    expect(衰(舊, 今)).toBeCloseTo(0.25, 3);
  });

  it("其時不可解者,不衰之 —— 疑則從其重", () => {
    expect(衰(r({ created_at: "not a date" }), 今)).toBe(1);
  });

  it("來日之报不益其重 —— 鐘或有偏,不可因之而重", () => {
    const 未來 = r({ created_at: new Date(今 + 30 * 日).toISOString() });
    expect(衰(未來, 今)).toBe(1);
  });
});

describe("段之罰", () => {
  it("無报則無罰", () => {
    expect(段之罰([], 今)).toBe(0);
  });

  it("眾报益之,而不倍之 —— 十人不當十倍於一人", () => {
    const 一 = 段之罰([r()], 今);
    const 十 = 段之罰(Array.from({ length: 10 }, () => r()), 今);
    expect(十).toBeGreaterThan(一);
    expect(十).toBeLessThan(一 * 4);
  });

  it("已驗者重於未驗者", () => {
    expect(段之罰([r({ status: "confirmed" })], 今))
      .toBeGreaterThan(段之罰([r()], 今));
  });

  it("久者輕於新者", () => {
    const 舊 = r({ created_at: new Date(今 - 半衰之日 * 日).toISOString() });
    expect(段之罰([舊], 今)).toBeLessThan(段之罰([r()], 今));
  });

  it("爭者損其重", () => {
    const 但报 = 段之罰([r()], 今);
    const 报而爭 = 段之罰([r(), r({ status: "disputed" })], 今);
    expect(报而爭).toBeLessThan(但报);
  });

  it("爭多則其罰歸零,而不為負 —— 不變式:罰恆非負", () => {
    const v = 段之罰([
      r(),
      r({ status: "disputed" }), r({ status: "disputed" }), r({ status: "disputed" }),
    ], 今);
    expect(v).toBeGreaterThanOrEqual(0);
  });

  it("凡諸組合,其罰恆非負 —— A* 之啟發式賴之", () => {
    const 狀: 报["status"][] = ["unverified", "confirmed", "disputed"];
    for (let n = 1; n <= 6; n++) {
      for (let k = 0; k < 40; k++) {
        const 列 = Array.from({ length: n }, () =>
          r({
            status: 狀[Math.floor(Math.random() * 3)],
            created_at: new Date(今 - Math.random() * 400 * 日).toISOString(),
          }));
        expect(段之罰(列, 今)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("罰之表", () => {
  it("依段而聚,罰為零者不入其表", () => {
    const m = 罰之表([
      r({ edge_id: 1 }),
      r({ edge_id: 2, status: "disputed" }),
      r({ edge_id: 1 }),
    ], 今);
    expect(m.has(1)).toBe(true);
    expect(m.has(2)).toBe(false);
  });

  it("其值皆為有限之數 —— NaN 一入,其段默然去於圖中", () => {
    const m = 罰之表([r({ edge_id: 3 }), r({ edge_id: 3, created_at: "bad" })], 今);
    for (const v of m.values()) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe("段之狀", () => {
  it("數其三狀,並記其最新", () => {
    const s = 段之狀([
      r({ status: "confirmed", created_at: new Date(今 - 2 * 日).toISOString() }),
      r({ status: "disputed" }),
      r(),
    ], 今);
    expect(s.總數).toBe(3);
    expect(s.確認).toBe(1);
    expect(s.存疑).toBe(1);
    expect(s.未驗).toBe(1);
    expect(s.最新).toBe(今);
  });

  it("無报則其最新為 null,非零", () => {
    expect(段之狀([], 今).最新).toBeNull();
  });
});

describe("幾時之前", () => {
  it("其文從其時", () => {
    expect(幾時之前(今, 今)).toBe("today");
    expect(幾時之前(今 - 日, 今)).toBe("yesterday");
    expect(幾時之前(今 - 5 * 日, 今)).toBe("5 days ago");
    expect(幾時之前(今 - 40 * 日, 今)).toBe("a month ago");
    expect(幾時之前(今 - 200 * 日, 今)).toBe("6 months ago");
  });
});

describe("基之重", () => {
  it("爭者為負 —— 其言「非也」,當損其重,非徒不益", () => {
    expect(基之重.disputed).toBeLessThan(0);
    expect(基之重.confirmed).toBeGreaterThan(基之重.unverified);
  });
});
