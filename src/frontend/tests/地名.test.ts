import { describe, expect, it } from "vitest";
import { 求地之址, 解地 } from "../src/data/地名";

/**
 * 界之序,與其所答之解。
 *
 * bbox 之序與 viewbox 之序不同 —— 誤之則其界自倒,而 Nominatim 默然歸於空,
 * 無誤可見。故必以一試釘之。
 * The pack's bbox and Nominatim's viewbox use different corner orders. Getting
 * it wrong yields an inverted box and an empty result set with no error, which
 * is exactly the kind of failure a test has to catch instead of a person.
 */
const 界: [number, number, number, number] = [-88.029, 44.504, -88.003, 44.523];

describe("求地之址", () => {
  it("viewbox 為 左上右下,非囊之序", () => {
    const u = new URL(求地之址("main st", 界));
    expect(u.searchParams.get("viewbox")).toBe("-88.029,44.523,-88.003,44.504");
    expect(u.searchParams.get("bounded")).toBe("1");
  });

  it("其詞見於其求", () => {
    const u = new URL(求地之址("100 Main St & 2nd", 界));
    expect(u.searchParams.get("q")).toBe("100 Main St & 2nd");
  });
});

describe("解地", () => {
  it("取其名其位,而略其國其州", () => {
    const r = 解地([
      { display_name: "Main Street, Downtown, Green Bay, Brown County, Wisconsin, 54301, United States", lon: "-88.01", lat: "44.51" },
    ]);
    expect(r).toEqual([{ label: "Main Street, Downtown, Green Bay", lon: -88.01, lat: 44.51 }]);
  });

  it("形不合者棄之,而不廢其餘", () => {
    const r = 解地([
      null,
      { display_name: "", lon: "1", lat: "2" },
      { display_name: "No position" },
      { display_name: "Bad number", lon: "x", lat: "2" },
      { display_name: "Good", lon: "-88.01", lat: "44.51" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].label).toBe("Good");
  });

  it("非列者歸於空,不擲", () => {
    expect(解地(null)).toEqual([]);
    expect(解地({ error: "nope" })).toEqual([]);
  });
});
