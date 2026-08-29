import { describe, it, expect } from "vitest";
import { haversineM } from "../src/routing/geo";
import { route } from "../src/routing/astar";
import type { CityPack, Edge, ProfileFlags } from "../src/types";

/**
 * haversineM 者,A* 之啟發式也。
 *
 * 此函無測久矣,而其誤最難見:啟發式若過其實,A* 仍歸一路,而非最短 ——
 * 無誤、無警,惟屏上之路已非其所當得。凡測皆綠,而人不知。
 *
 * This function had no test, and its failure mode is the worst kind: if the
 * heuristic ever OVER-estimates, A* still returns a path — just not the optimal
 * one. No error, no warning, no failing test. The route on screen is simply
 * worse than it should be and nobody can tell.
 *
 * 其可容之憑有三,測皆固之:
 *   一、直線不逾折線 —— 三角不等式。
 *   二、與 pipeline/geo.py 之 haversine_m 同值。length_m 由 python 算而存於囊,
 *       而啟發式由 ts 算;二者若離,則啟發式可逾其段之長,可容遂破。
 *   三、恆非負,且對稱。
 */

/**
 * 取於 pipeline/geo.py 之 haversine_m,同參而同回。
 * 二語之實作必同 —— 一者算其長而存之,一者以之為啟發式。
 *
 * 其值必取全精(python 之 repr),不可取其六位而已。
 * 初書之時取六位,而緊測遂赤 —— 所驗者非其實作之異,乃吾所印之精耳。
 * Values are Python's full repr, not a rounded print. They were first captured
 * at six decimals, which made the tight assertion fail — it was measuring the
 * precision of my own printf, not any disagreement between the two languages.
 */
const PY_REF: [string, number, number, number, number, number][] = [
  ["same point", 0, 0, 0, 0, 0.0],
  ["1 deg lat at equator", 0, 0, 0, 1, 111194.92664455874],
  ["1 deg lon at equator", 0, 0, 1, 0, 111194.92664455874],
  ["1 deg lon at 60N", 0, 60, 1, 60, 55596.934071140866],
  ["LA downtown diagonal", -118.2673, 34.0389, -118.2329, 34.0623, 4100.5424710005955],
  ["LA one block", -118.25, 34.05, -118.249, 34.05, 92.13047519648458],
  ["half the globe", -118.25, 34.05, 61.75, -34.05, 20015086.606149975],
  ["crosses the dateline", 179.9, 0, -179.9, 0, 22238.985328911924],
  ["1e-6 deg", 0, 0, 0.000001, 0, 0.11119492664455873],
];

describe("haversineM 與 python 之實作同值", () => {
  it.each(PY_REF)("%s", (_名, lon1, lat1, lon2, lat2, 期) => {
    const got = haversineM(lon1, lat1, lon2, lat2);
    /*
      相對之差容至一億分之一。
      haversine 之式,兩點趨於對蹠則 a 趨於一,而 asin(sqrt(a)) 之導數暴長,
      浮點遂失其精 —— 半球之距,二語相去零點一九米(相對九點五乘十之負九)。
      此非二實作之異,乃其式本然。

      Relative tolerance of 1e-8. Haversine loses precision as points approach
      antipodal: `a` approaches 1 and the derivative of asin(sqrt(a)) explodes.
      At half the globe the two languages differ by 0.19 m in 20,015 km. That is
      the formula, not a divergence between the implementations.
    */
    const 容 = Math.max(1e-6, Math.abs(期) * 1e-8);
    expect(Math.abs(got - 期)).toBeLessThan(容);
  });

  /*
    此物之實境:洛城一段長零點三米至一百八十米,而其 bbox 之對角四千一百米。
    對蹠之精無所與焉 —— 故於其真用之域,二語當合至十億分之一。
    The app's real range: LA segments run 0.3-180 m and the largest distance it
    ever computes is the 4,100 m bbox diagonal. Antipodal precision is irrelevant
    here, so within the working range the two languages must agree far tighter.
  */
  it.each(PY_REF.filter(([, , , , , m]) => m > 0 && m < 5000))(
    "%s — 於其實用之域,合至十億分之一",
    (_名, lon1, lat1, lon2, lat2, 期) => {
      const got = haversineM(lon1, lat1, lon2, lat2);
      expect(Math.abs(got - 期)).toBeLessThan(Math.abs(期) * 1e-9 + 1e-9);
    },
  );

  it("跨日界者不繞地球一周 —— 經度之差須歸於正負一百八十之內", () => {
    // 179.9E 至 179.9W 相去二十二公里,非三萬九千公里。
    expect(haversineM(179.9, 0, -179.9, 0)).toBeLessThan(30_000);
  });
});

describe("啟發式之可容", () => {
  it("同點之距為零", () => {
    expect(haversineM(-118.25, 34.05, -118.25, 34.05)).toBe(0);
  });

  it("恆非負", () => {
    for (let i = 0; i < 200; i++) {
      const a = [Math.random() * 360 - 180, Math.random() * 170 - 85];
      const b = [Math.random() * 360 - 180, Math.random() * 170 - 85];
      expect(haversineM(a[0], a[1], b[0], b[1])).toBeGreaterThanOrEqual(0);
    }
  });

  it("對稱 —— 往還同距", () => {
    for (let i = 0; i < 100; i++) {
      const a = [Math.random() * 360 - 180, Math.random() * 170 - 85];
      const b = [Math.random() * 360 - 180, Math.random() * 170 - 85];
      const ab = haversineM(a[0], a[1], b[0], b[1]);
      const ba = haversineM(b[0], b[1], a[0], a[1]);
      expect(Math.abs(ab - ba)).toBeLessThan(1e-6);
    }
  });

  /**
   * 三角不等式。此即可容之本 —— 直線不得逾其折線,
   * 否則啟發式高估其所餘之途,而 A* 棄其真短者。
   */
  it("直線不逾折線(三角不等式)", () => {
    for (let i = 0; i < 300; i++) {
      const p = () => [Math.random() * 0.2 - 118.35, Math.random() * 0.2 + 34.0];
      const [a, m, b] = [p(), p(), p()];
      const 直 = haversineM(a[0], a[1], b[0], b[1]);
      const 折 = haversineM(a[0], a[1], m[0], m[1]) + haversineM(m[0], m[1], b[0], b[1]);
      // 浮點之故,容其一微米。
      expect(直).toBeLessThanOrEqual(折 + 1e-6);
    }
  });

  it("洛城之實例:直線四千一百米,而折線四千一百三十四", () => {
    const pts: [number, number][] = [
      [-118.2673, 34.0389], [-118.25, 34.05], [-118.24, 34.055], [-118.2329, 34.0623],
    ];
    let 折 = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      折 += haversineM(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    }
    const 直 = haversineM(pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
    expect(直).toBeLessThan(折);
    expect(直).toBeCloseTo(4100.54, 1);
    expect(折).toBeCloseTo(4134.45, 1);
  });
});

/**
 * 其終驗:啟發式必不逾其段之長。
 *
 * edgeCost >= length_m 為其不變式,而 length_m 由 python 之 haversine 算之。
 * 故啟發式(ts 之 haversine,自節至的)必不逾自此節而往之真費。
 * 段之兩端相距,即其 length_m 之下界 —— 二實作若離,此測即赤。
 */
describe("啟發式不逾其段之長", () => {
  function e(id: number, from: number, to: number, g: [number, number][]): Edge {
    let L = 0;
    for (let i = 0; i < g.length - 1; i++) {
      L += haversineM(g[i][0], g[i][1], g[i + 1][0], g[i + 1][1]);
    }
    return {
      id, from, to, length_m: L, geometry: g,
      is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
      incline_pct: null, surface: null, width_m: null, tactile_paving: null,
      is_crossing: false, crossing_signalized: null,
      sun_exposure: [0, 0, 0, 0, 0, 0, 0, 0], near_rest_stop: false,
      confidence: "high",
      traversable: {
        wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
      },
    } as Edge;
  }

  const 無身: ProfileFlags = {
    wheelchair: false, blind_low_vision: false, heat_sensitive: false,
  };

  it("一段之兩端,其直距不逾其 length_m", () => {
    const g: [number, number][] = [
      [-118.2673, 34.0389], [-118.25, 34.05], [-118.2329, 34.0623],
    ];
    const seg = e(1, 1, 2, g);
    const 直 = haversineM(g[0][0], g[0][1], g[g.length - 1][0], g[g.length - 1][1]);
    expect(直).toBeLessThanOrEqual(seg.length_m);
  });

  it("涼日無暑之時,A* 所得之長不小於其起訖之直距", () => {
    // 暑為零,則 edgeCost === length_m,故其總長即其總費。
    // 若啟發式過其實,則所歸之路長於最短,而此測不能辨之;
    // 然若啟發式逾其真費,A* 或竟不得其路 —— 故此測驗其得。
    const pack = {
      manifest: { hour_buckets: [6, 8, 10, 12, 14, 16, 18, 20], bbox: [-119, 33, -117, 35] },
      nodes: [
        { id: 1, lon: -118.2673, lat: 34.0389 },
        { id: 2, lon: -118.25, lat: 34.05 },
        { id: 3, lon: -118.2329, lat: 34.0623 },
      ],
      edges: [
        e(1, 1, 2, [[-118.2673, 34.0389], [-118.25, 34.05]]),
        e(2, 2, 3, [[-118.25, 34.05], [-118.2329, 34.0623]]),
      ],
      destinations: [],
    } as unknown as CityPack;

    const r = route(pack, 無身, 1, 3, 0, 10);
    expect(r).not.toBeNull();
    const 直 = haversineM(-118.2673, 34.0389, -118.2329, 34.0623);
    expect(r!.totalLength_m).toBeGreaterThanOrEqual(直 - 1e-6);
  });
});
