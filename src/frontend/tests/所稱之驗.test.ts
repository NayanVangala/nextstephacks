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
    器所舉者,必實省而不誣 —— 然不必為其至善。

    其守曰:曝全無之時不舉。此守所拒者二,而其一當拒,其一不當:
      當拒者,夜也 —— 二十時之日在地下一度有四(其擬之日為七月十九),
      「待日沒而行」非蔭之計,且其省必為十成,舉之則每路皆此時,其言遂廢。
      不當拒者,白晝而全蔭也 —— 十八時之日尚二十二度,而數路於其時全在影中。
      此正暑者所欲聞,而器默然,反舉十六時之七成有一。

    量之於五十六路:如此者二(百之四)。其言非誣,特非其至善耳。
    其根在囊:pipeline 算其日之高度而不書之於囊(shade/sun.py 有之,
    而 manifest 無之),故前端無以別「日已沒」與「此路全蔭」,
    但以其曝之零推之。欲正之,須書其高度於囊而後改此守。

    Documented, not asserted away. The guard skips hours whose total exposure is
    zero. That correctly refuses night — at 20:00 the sun is 1.4° BELOW the
    horizon on the modelled day, and "wait until dark" is not a shade strategy —
    but it also refuses genuine full shade in daylight: at 18:00 the sun is
    still 22° up, and 2 of 56 sampled routes are entirely shaded then. Those get
    told "71% at 16:00" instead of the 100% actually available.

    Root cause is in the pack, not here: the pipeline computes per-bucket solar
    altitude (shade/sun.py) and does not emit it, so the frontend cannot tell
    "sun is down" from "this route is fully shaded" and infers it from zero
    exposure. Fixing it means emitting altitude into the manifest.
  */
  it("器所舉者必實省 —— 其至善與否,別為一事(見上)", () => {
    for (const r of 路) {
      const g = 算遲行之利(r.edges, 午後, pack.manifest.hour_buckets.length);
      if (!g) continue;
      // 所舉之時,其曝必實少於今 —— 此為其勸之底,不可破。
      expect(路之曝米(r.edges, g.善之時序)).toBeLessThan(路之曝米(r.edges, 午後));
      expect(g.省之比).toBeGreaterThan(0);
      // 夜不可舉。二十時者,日在地下。
      expect(路之曝米(r.edges, g.善之時序)).toBeGreaterThan(0);
    }
  });
});
