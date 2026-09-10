import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { route, nearestRoutableNode } from "../src/routing/astar";
import { 算遲行之利, 路之曝米 } from "../src/routing/cost";
import type { CityPack, ProfileFlags } from "../src/types";

/**
 * 所稱之驗 —— 凡投於外者,其數必出於此。
 *
 * devpost 之文稱「同路而行於十八時,其曝減六成」。此數前無所出:
 * 非量於實路,乃約舉之。而此器之所以立,正在「其數與其疑並行」——
 * 則其自陳之數,尤不可為約舉。
 *
 * 量之於三十路(洛城真囊,heat-sensitive 之身,三十五度):
 *   十四時之於十八時:中位五成八,其少者二成五,其多者十成
 * 六成者近其中位,而其實隨路而異二至四倍。故其文改為「約六成」
 * 並舉其範,而此測守其中位之所在。
 *
 * Every number that goes into the submission or the demo video is pinned here.
 * The "60%" figure was an approximation nobody had measured; across 30 real
 * downtown LA routes the median is 58% with a 25–100% spread. For a tool whose
 * whole claim is that uncertainty ships beside the number, quoting a bare 60%
 * was the one thing it should not do. The copy now states the median and the
 * range, and this test is what keeps that true.
 */

const pack = JSON.parse(gunzipSync(readFileSync(
  new URL("../public/city-packs/la.json.gz", import.meta.url),
)).toString("utf8")) as CityPack;

const 暑之身: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: true,
};

const 午後 = 4; // hour_buckets[4] === 14:00
const 向晚 = 6; // hour_buckets[6] === 18:00

/** 網之上取三十路,自其格之角而出,故其取可復。 */
function 諸路() {
  const [mnLon, mnLat, mxLon, mxLat] = pack.manifest.bbox;
  const 出: { edges: CityPack["edges"] }[] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if (i === j) continue;
      const a = nearestRoutableNode(pack, 暑之身,
        mnLon + (mxLon - mnLon) * (i + 0.5) / 6, mnLat + (mxLat - mnLat) * (i + 0.5) / 6);
      const b = nearestRoutableNode(pack, 暑之身,
        mnLon + (mxLon - mnLon) * (j + 0.5) / 6, mxLat - (mxLat - mnLat) * (j + 0.5) / 6);
      if (a == null || b == null) continue;
      const r = route(pack, 暑之身, a, b, 午後, 35);
      if (r && r.edges.length >= 5) 出.push(r);
    }
  }
  return 出;
}

const 中位 = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

describe("所稱之數,皆出於實", () => {
  const 路 = 諸路();

  it("其路之數足以言中位", () => {
    expect(路.length).toBeGreaterThanOrEqual(20);
  });

  it("十四時之於十八時:中位近六成 —— devpost 所稱者此", () => {
    const 減 = 路
      .map((r) => ({ a: 路之曝米(r.edges, 午後), b: 路之曝米(r.edges, 向晚) }))
      .filter((x) => x.a > 0)
      .map((x) => (x.a - x.b) / x.a);
    const m = 中位(減);
    // 五成至七成 —— 其文稱「約六成」,故其界當容其實而拒其誣。
    expect(m).toBeGreaterThan(0.5);
    expect(m).toBeLessThan(0.7);
  });

  it("其減隨路而異,故不可以一數盡之 —— 其文必舉其範", () => {
    const 減 = 路
      .map((r) => ({ a: 路之曝米(r.edges, 午後), b: 路之曝米(r.edges, 向晚) }))
      .filter((x) => x.a > 0)
      .map((x) => (x.a - x.b) / x.a);
    // 其少者遠不及其中位。若此不復真,則其文可以一數言之。
    expect(Math.min(...減)).toBeLessThan(0.4);
    expect(Math.max(...減)).toBeGreaterThan(0.9);
  });

  /*
    器所舉者,必實省,且必為其至善之白晝。

    其守前此以曝之零為夜,故十八時全蔭之路(其日尚二十二度)為所棄,
    反舉十六時之次者 —— 洛城五十六路之中,如此者二。
    今其守取諸 manifest.sun_altitude_deg,乃能別「日已沒」與「此路全蔭」。

    The guard used to infer night from zero exposure, which discarded genuine
    full shade in daylight. It now reads per-bucket solar altitude from the pack.
  */
  it("器所舉者,必為白晝之至善 —— 夜不舉,而全蔭不棄", () => {
    const 高 = pack.manifest.sun_altitude_deg;
    expect(高, "囊當載其日高").toBeDefined();
    expect(高!.length).toBe(pack.manifest.hour_buckets.length);

    for (const r of 路) {
      const g = 算遲行之利(r.edges, 午後, pack.manifest.hour_buckets.length, 高);
      const 今 = 路之曝米(r.edges, 午後);
      if (今 <= 0) continue;

      // 白晝諸刻之至善。
      let 至善 = 今;
      for (let h = 0; h < 高!.length; h++) {
        if (高![h] <= 0) continue;
        至善 = Math.min(至善, 路之曝米(r.edges, h));
      }
      if (至善 >= 今) { expect(g).toBeNull(); continue; }

      expect(g).not.toBeNull();
      // 所舉者必為白晝。
      expect(高![g!.善之時序]).toBeGreaterThan(0);
      // 且必為其至善 —— 全蔭之刻不復為所棄。
      expect(路之曝米(r.edges, g!.善之時序)).toBeCloseTo(至善, 6);
    }
  });

  it("囊無其日高者,從其舊法而不廢 —— fork 之舊囊賴此", () => {
    const r = 路[0];
    const g = 算遲行之利(r.edges, 午後, pack.manifest.hour_buckets.length);
    // 舊法猶行,但其果或非至善(此正所以立其新法)。
    if (g) expect(g.省之比).toBeGreaterThan(0);
  });
});
