import { describe, it, expect } from "vitest";
import { 取警, 暑之底, 限之減, type 一警 } from "../src/data/警";
import { heatIndexNorm } from "../src/routing/cost";

/**
 * 警之測。
 *
 * The governing property, and the one worth breaking a build over: an alert may
 * only ever make this tool MORE cautious. It can raise modelled heat severity
 * and shrink the reach budget; it can never lower either. If an alert could make
 * the app claim you can reach somewhere it would otherwise have ruled out, the
 * alert would be actively dangerous to the person relying on it.
 */

function a(event: string, over: Partial<一警> = {}): 一警 {
  return {
    event, severity: "Severe", sender: "NWS Test", headline: null,
    instruction: null, onset: null, expires: null, ...over,
  };
}

describe("暑之底", () => {
  it("無警則無底", () => {
    expect(暑之底(null)).toBe(0);
    expect(暑之底([])).toBe(0);
  });

  it("warning 重於 watch,watch 重於 advisory", () => {
    const w = 暑之底([a("Extreme Heat Warning")]);
    const t = 暑之底([a("Extreme Heat Watch")]);
    const d = 暑之底([a("Heat Advisory")]);
    expect(w).toBeGreaterThan(t);
    expect(t).toBeGreaterThan(d);
    expect(d).toBeGreaterThan(0);
  });

  it("數警並存,取其最重者", () => {
    expect(暑之底([a("Heat Advisory"), a("Extreme Heat Warning")]))
      .toBe(暑之底([a("Extreme Heat Warning")]));
  });

  it("其底不逾一 —— heatIndexNorm 之域為零至一", () => {
    for (const e of ["Extreme Heat Warning", "Excessive Heat Warning", "Heat Advisory"]) {
      const v = 暑之底([a(e)]);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("heatIndexNorm 之底", () => {
  it("底而非蓋 —— 溫已逾之則從其溫", () => {
    // 四十五度,其常值已為一。底八分五不當降之。
    expect(heatIndexNorm(45, 0.85)).toBe(1);
  });

  it("溫低而警重,則從其警", () => {
    // 二十六度,其常值約零點零六七。
    expect(heatIndexNorm(26)).toBeCloseTo(0.0667, 3);
    expect(heatIndexNorm(26, 0.85)).toBe(0.85);
  });

  it("底恆不減其值 —— 此為其不變式", () => {
    for (const t of [10, 20, 25, 30, 35, 40, 50]) {
      for (const 底 of [0, 0.3, 0.5, 0.85, 1]) {
        expect(heatIndexNorm(t, 底)).toBeGreaterThanOrEqual(heatIndexNorm(t));
      }
    }
  });

  it("底逾一或為負者,仍拘於零至一", () => {
    expect(heatIndexNorm(10, 5)).toBe(1);
    expect(heatIndexNorm(30, -3)).toBe(heatIndexNorm(30));
  });
});

describe("限之減", () => {
  it("無警則其限不減", () => {
    expect(限之減(null)).toBe(1);
    expect(限之減([])).toBe(1);
  });

  it("警愈重則其限愈小,而恆不逾一", () => {
    const w = 限之減([a("Extreme Heat Warning")]);
    const t = 限之減([a("Extreme Heat Watch")]);
    const d = 限之減([a("Heat Advisory")]);
    expect(w).toBeLessThan(t);
    expect(t).toBeLessThan(d);
    expect(d).toBeLessThan(1);
    for (const v of [w, t, d]) expect(v).toBeGreaterThan(0);
  });

  it("恆不逾一 —— 警不可使其限反寬", () => {
    for (const e of ["Extreme Heat Warning", "Heat Advisory", "Extreme Heat Watch"]) {
      expect(限之減([a(e)])).toBeLessThanOrEqual(1);
    }
  });
});

function 回(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () => ({
    ok, status, json: async () => body,
  })) as unknown as typeof fetch;
}

const 今 = Date.parse("2026-08-28T12:00:00Z");
const 未過 = "2026-08-28T20:00:00Z";
const 已過 = "2026-08-28T06:00:00Z";

describe("取警", () => {
  it("取暑之警,而遺其餘", async () => {
    const r = await 取警(34, -118, 回({
      features: [
        { properties: { event: "Extreme Heat Warning", expires: 未過 } },
        { properties: { event: "Flood Watch", expires: 未過 } },
        { properties: { event: "High Wind Warning", expires: 未過 } },
      ],
    }), 今);
    expect(r.警).toHaveLength(1);
    expect(r.警![0].event).toBe("Extreme Heat Warning");
  });

  it("已過者不施於今日之路", async () => {
    const r = await 取警(34, -118, 回({
      features: [
        { properties: { event: "Heat Advisory", expires: 已過 } },
        { properties: { event: "Extreme Heat Warning", expires: 未過 } },
      ],
    }), 今);
    expect(r.警!.map((x) => x.event)).toEqual(["Extreme Heat Warning"]);
  });

  it("無 expires 者存之 —— 無期非已過", async () => {
    const r = await 取警(34, -118, 回({
      features: [{ properties: { event: "Heat Advisory" } }],
    }), 今);
    expect(r.警).toHaveLength(1);
  });

  it("取而無警者,回空列而非 null —— 「已問而無」與「未問」異", async () => {
    const r = await 取警(34, -118, 回({ features: [] }), 今);
    expect(r.警).toEqual([]);
    expect(r.誤).toBeNull();
  });

  it("取之不得者,回 null 而載其誤 —— 不可默然作無警論", async () => {
    const r = await 取警(34, -118, 回(null, false, 503), 今);
    expect(r.警).toBeNull();
    expect(r.誤).toMatch(/503/);
  });

  it("網斷而擲者亦然,不使其誤上達", async () => {
    const 擲 = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const r = await 取警(34, -118, 擲, 今);
    expect(r.警).toBeNull();
    expect(r.誤).toMatch(/network down/);
  });

  it("其形不合者略之,不擲", async () => {
    const r = await 取警(34, -118, 回({
      features: [
        { properties: null },
        {},
        { properties: { event: 42 } },
        { properties: { event: "Heat Advisory", expires: 未過 } },
      ],
    }), 今);
    expect(r.警).toHaveLength(1);
  });

  it("闕其 sender、headline 者,不以空字充之", async () => {
    const r = await 取警(34, -118, 回({
      features: [{ properties: { event: "Heat Advisory", expires: 未過 } }],
    }), 今);
    expect(r.警![0].headline).toBeNull();
    expect(r.警![0].instruction).toBeNull();
    expect(r.警![0].sender).toBe("NWS");
  });
});
