import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { 可通之率, 蔭之率, 斷之率, 信之分佈 } from "../src/report/度量";
import type { CityPack, ProfileFlags, 國之表 } from "../src/types";

/**
 * 兩語相符之驗。
 *
 * 國之表算於 Python(pipeline/國),而城之審算於此(度量.ts)。
 * 二者所量者同,而其碼各在其語 —— 故其歧為必然之險,且默然:
 * 洛城於「All cities」為九成九可通,而於「City audit」為九成八,
 * 二數並在一器之中,而無一處自言其異。此試所以立。
 *
 * Same precedent as the haversine agreement test the README describes: two
 * implementations of one definition in two languages will drift, the drift is
 * silent, and the only thing that catches it is running both against the same
 * input. Los Angeles reading 99% traversable on the national tab and 98% on the
 * city audit would be a defect nobody could see from either screen alone.
 *
 * 其入為真囊與真表,非所造者 —— 所欲驗者正是所出之物。
 */

const 表: 國之表 = JSON.parse(
  readFileSync(new URL("../public/national.json", import.meta.url), "utf8"),
);

const 囊: CityPack = JSON.parse(
  gunzipSync(readFileSync(new URL("../public/city-packs/la.json.gz", import.meta.url))).toString("utf8"),
);

const 輪椅: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: false,
};

/** Python 之數四捨於四位,故其容為半個末位。 */
const 容 = 1e-4;

describe("國之表 —— 其算與城之審相符", () => {
  const la = 表.cities.find((c) => c.id === "la")!;

  it("洛城在其表", () => {
    expect(la).toBeDefined();
    expect(la.name).toBe("Los Angeles");
    expect(la.segments).toBe(囊.edges.length);
    expect(la.nodes).toBe(囊.nodes.length);
  });

  it("可通之率,兩語同", () => {
    expect(la.profiles.wheelchair.traversable_rate)
      .toBeCloseTo(可通之率(囊, 輪椅).率, 3);
  });

  it("蔭之率,兩語同 —— 其刻與其界皆須同,不然則同城而二數", () => {
    const 序 = 表.hour_bucket_index;
    expect(la.profiles.wheelchair.shade_rate)
      .toBeCloseTo(蔭之率(囊, 輪椅, 序, 表.shade_threshold).率, 3);
  });

  it("斷之率,兩語同 —— 此賴連通之算,二語各為之", () => {
    expect(la.profiles.wheelchair.severed_rate)
      .toBeCloseTo(斷之率(囊, 輪椅).率, 3);
  });

  it("信之分佈,兩語同", () => {
    const 信 = 信之分佈(囊);
    for (const k of ["high", "medium", "low"] as const) {
      expect(la.confidence[k].count).toBe(信[k].數);
      expect(la.confidence[k].length_m).toBeCloseTo(信[k].米, 0);
    }
  });

  it("明籤之比,亦算於 Python —— 前端不再算之,其界不可二書", () => {
    const 信 = 信之分佈(囊);
    expect(la.tagged_rate).toBeCloseTo(信.high.米 / la.length_m, 3);
    expect(la.well_surveyed).toBe(la.tagged_rate >= 表.tagged_threshold);
  });
});

describe("國之表 —— 其形", () => {
  it("三十八城,其識不重", () => {
    expect(表.cities).toHaveLength(38);
    expect(new Set(表.cities.map((c) => c.id)).size).toBe(38);
  });

  it("四身皆具 —— none 為斷之率之所本,不可闕", () => {
    for (const c of 表.cities) {
      for (const 身 of ["none", "wheelchair", "blind_low_vision", "heat_sensitive"] as const) {
        expect(c.profiles[身], `${c.id}/${身}`).toBeDefined();
      }
    }
  });

  it("諸率皆在零一之間", () => {
    for (const c of 表.cities) {
      for (const p of Object.values(c.profiles)) {
        expect(p.traversable_rate).toBeGreaterThanOrEqual(0);
        expect(p.traversable_rate).toBeLessThanOrEqual(1 + 容);
        expect(p.severed_rate).toBeGreaterThanOrEqual(0);
        expect(p.severed_rate).toBeLessThanOrEqual(1 + 容);
        expect(p.shade_rate).toBeGreaterThanOrEqual(0);
        expect(p.shade_rate).toBeLessThanOrEqual(1 + 容);
      }
    }
  });

  it("無所限者不得有所斷 —— none 即其比之所本", () => {
    for (const c of 表.cities) {
      expect(c.profiles.none.severed_nodes, c.id).toBe(0);
      expect(c.profiles.none.traversable_rate, c.id).toBeCloseTo(1, 3);
    }
  });

  it("樓之高:無樓者其率為 null,非零", () => {
    for (const c of 表.cities) {
      if (c.buildings_total === 0) expect(c.assumed_height_rate, c.id).toBeNull();
      else expect(c.assumed_height_rate, c.id).toBeGreaterThanOrEqual(0);
    }
  });

  /*
    此為此表之所以危,故驗其數猶在。
    籤寡之城其表為「百之百可通、無所斷」—— 若此數消失,則其表可徑次之
    而不害,而此view之戒亦當去。今其猶在,故其戒必存。
    The reason the view leads with its own limitation. If this ever stops being
    true the warning could be softened — while it holds, the warning must stay.
  */
  it("籤寡之城猶在,且其表猶善 —— 此表之戒賴此而立", () => {
    const 寡 = 表.cities.filter((c) => !c.well_surveyed);
    expect(寡.length).toBeGreaterThan(0);
    expect(表.survey_correlation.below_threshold).toBe(寡.length);
    // 其中至少一城,籤近於零而斷亦近於零 —— 是「未測」冒「無礙」之貌。
    const 極 = 寡.filter(
      (c) => c.tagged_rate < 0.001 && c.profiles.wheelchair.severed_rate < 0.005,
    );
    expect(極.length).toBeGreaterThan(0);
  });

  it("籤與斷之相關,已量而書之 —— 不可闕", () => {
    expect(表.survey_correlation.n).toBe(38);
    expect(表.survey_correlation.tagged_vs_severed).not.toBeNull();
    expect(Math.abs(表.survey_correlation.tagged_vs_severed!)).toBeLessThanOrEqual(1);
  });
});
