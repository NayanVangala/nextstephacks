import { describe, it, expect } from "vitest";
import { 算遲行之利, 路之曝米 } from "../src/routing/cost";
import { 阻之故, 路之權衡 } from "../src/routing/阻";
import type { CityPack, Edge, ProfileFlags } from "../src/types";

const 無身: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const 輪椅: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: false,
};

function e(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0.001, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: false,
    confidence: "high",
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  } as Edge;
}

describe("算遲行之利", () => {
  it("同路他時而曝少者,舉其最善(日中者)", () => {
    // 午時全曝,夕漸蔭,時序七為夜(曝零)。
    // 此測初書之時,期其舉時序七 —— 誤也。夜之省必為十成,則每路皆舉之,
    // 其言遂無用。既正其模,乃改此測以從之,非弱其模以從此測。
    const edges = [e(1, 1, 2, { sun_exposure: [0.2, 0.5, 1, 1, 1, 0.5, 0.1, 0] })];
    const r = 算遲行之利(edges, 4, 8);
    expect(r).not.toBeNull();
    expect(r!.善之時序).toBe(6);
    expect(r!.省之比).toBeCloseTo(0.9, 5);
  });

  it("今已為最善者,則無所舉 —— 不當勸人徒待", () => {
    const edges = [e(1, 1, 2, { sun_exposure: [0, 0.5, 1, 1, 1, 1, 1, 1] })];
    expect(算遲行之利(edges, 0, 8)).toBeNull();
  });

  it("諸時皆同者,無所舉", () => {
    expect(算遲行之利([e(1, 1, 2)], 4, 8)).toBeNull();
  });

  it("無段則無所舉", () => {
    expect(算遲行之利([], 4, 8)).toBeNull();
  });

  it("曝米者,長乘其實曝而積之", () => {
    const edges = [
      e(1, 1, 2, { length_m: 100, sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] }),
      e(2, 2, 3, { length_m: 200, sun_exposure: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] }),
    ];
    // 100*1 + 200*0.5 = 200
    expect(路之曝米(edges, 0)).toBeCloseTo(200, 5);
  });

  it("憩息之側所減者,亦入其算 —— 與 routing 所用之實曝同,不可異", () => {
    const 有憩 = [e(1, 1, 2, { length_m: 100, near_rest_stop: true })];
    const 無憩 = [e(1, 1, 2, { length_m: 100, near_rest_stop: false })];
    expect(路之曝米(有憩, 0)).toBeLessThan(路之曝米(無憩, 0));
  });
});

/** 三節之直線。二至三為階,故輪椅不可過。 */
function 造囊(): CityPack {
  return {
    manifest: { hour_buckets: [6, 8, 10, 12, 14, 16, 18, 20], bbox: [0, 0, 1, 1] },
    nodes: [
      { id: 1, lon: 0, lat: 0 },
      { id: 2, lon: 0.001, lat: 0 },
      { id: 3, lon: 0.002, lat: 0 },
    ],
    edges: [
      e(1, 1, 2),
      e(2, 2, 3, {
        is_steps: true, step_count: 12,
        geometry: [[0.001, 0], [0.002, 0]],
        traversable: {
          wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
        },
      }),
    ],
    destinations: [],
  } as unknown as CityPack;
}

describe("阻之故", () => {
  it("身無所限者,無所謂阻", () => {
    expect(阻之故(造囊(), 無身, 1, 3, 4, 30)).toBeNull();
  });

  it("眾人可至而此身不可者,名其所阻並其數", () => {
    const r = 阻之故(造囊(), 輪椅, 1, 3, 4, 30);
    expect(r).not.toBeNull();
    expect(r!.眾人亦不可至).toBe(false);
    expect(r!.總數).toBe(1);
    expect(r!.項[0].類).toBe("steps");
    expect(r!.項[0].階數).toBe(12);
  });

  it("眾人亦不可至者,明言其非身之故", () => {
    const 囊 = 造囊();
    // 去其橋,則二分支不相連,眾人亦不可至。
    囊.edges = [囊.edges[0]];
    const r = 阻之故(囊, 輪椅, 1, 3, 4, 30);
    expect(r!.眾人亦不可至).toBe(true);
    expect(r!.項).toEqual([]);
  });

  it("階之級數闕者,其數為 null,非零 —— 有階而不知其級,常也", () => {
    const 囊 = 造囊();
    囊.edges[1].step_count = null;
    const r = 阻之故(囊, 輪椅, 1, 3, 4, 30);
    expect(r!.項[0].階數).toBeNull();
    expect(r!.項[0].數).toBe(1);
  });
});

describe("算遲行之利 —— 日沒之時不與焉", () => {
  it("曝全無之時不舉 —— 夜必勝其較,舉之則每路皆言此時,其言遂無用", () => {
    // 時序七為夜,曝皆零。日中則全曝,夕則半。
    const edges = [e(1, 1, 2, { sun_exposure: [0.3, 0.6, 0.9, 1, 1, 0.5, 0.2, 0] })];
    const r = 算遲行之利(edges, 4, 8);
    expect(r).not.toBeNull();
    // 夜(七)勝之,然不可舉。其次善者為六。
    expect(r!.善之時序).toBe(6);
    expect(r!.省之比).toBeCloseTo(0.8, 5);
  });

  it("日中之外皆夜者,則無所舉", () => {
    const edges = [e(1, 1, 2, { sun_exposure: [0, 0, 0, 0, 1, 0, 0, 0] })];
    expect(算遲行之利(edges, 4, 8)).toBeNull();
  });
});


/**
 * 繞路之囊。二至四有階而直,二至三至四無階而迂。
 *
 *      2 ──階── 4        眾人:一二四,三百米
 *    ╱        ╱
 *   1        3           輪椅:一二三四,四百五十米 —— 繞百五十米
 *            ╱
 *      2 ────
 *
 * 其長皆百五十,而其geometry所跨者不逾百二十 —— 啟發式為 haversine,
 * 必不逾其值,不然則 A* 不復可容而其路非最短,且無聲。
 * Every length_m exceeds its own haversine span on purpose: the heuristic is
 * raw haversine metres and is admissible only while cost >= physical length.
 */
function 造繞之囊(): CityPack {
  return {
    manifest: { hour_buckets: [6, 8, 10, 12, 14, 16, 18, 20], bbox: [0, 0, 1, 1] },
    nodes: [
      { id: 1, lon: 0, lat: 0 },
      { id: 2, lon: 0.001, lat: 0 },
      { id: 3, lon: 0.0015, lat: 0.0005 },
      { id: 4, lon: 0.002, lat: 0 },
    ],
    edges: [
      e(1, 1, 2, { length_m: 150, geometry: [[0, 0], [0.001, 0]] }),
      e(2, 2, 4, {
        length_m: 150, geometry: [[0.001, 0], [0.002, 0]],
        is_steps: true, step_count: 9,
        traversable: {
          wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
        },
      }),
      e(3, 2, 3, { length_m: 150, geometry: [[0.001, 0], [0.0015, 0.0005]] }),
      e(4, 3, 4, { length_m: 150, geometry: [[0.0015, 0.0005], [0.002, 0]] }),
    ],
    destinations: [],
  } as unknown as CityPack;
}

describe("路之權衡", () => {
  it("身無所限者,無所謂繞 —— 己之路即眾人之路", () => {
    expect(路之權衡(造繞之囊(), 無身, 1, 4, 4, 30, 300)).toBeNull();
  });

  it("繞者,名其米與其所避", () => {
    const 囊 = 造繞之囊();
    // 輪椅之路:一二三四,四百五十。
    const r = 路之權衡(囊, 輪椅, 1, 4, 4, 30, 450);
    expect(r).not.toBeNull();
    expect(r!.同路).toBe(false);
    // 眾人之路三百,己之路四百五十。
    expect(r!.繞之米).toBeCloseTo(150, 0);
    expect(r!.避).toHaveLength(1);
    expect(r!.避[0].類).toBe("steps");
    expect(r!.避[0].數).toBe(1);
    expect(r!.避[0].階數).toBe(9);
  });

  it("無阻者為同路 —— 其言為一果,非一闕", () => {
    const 囊 = 造繞之囊();
    // 去其階,則直路輪椅亦可行,眾人之路即己之路。
    囊.edges[1].is_steps = false;
    囊.edges[1].traversable = {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    };
    const r = 路之權衡(囊, 輪椅, 1, 4, 4, 30, 300);
    expect(r!.同路).toBe(true);
    expect(r!.繞之米).toBe(0);
    expect(r!.避).toEqual([]);
  });

  it("眾人亦不可至者回 null —— 其言歸於阻之故,不歸於此", () => {
    const 囊 = 造繞之囊();
    // 盡去至四之路,則四孤。
    囊.edges = [囊.edges[0],囊.edges[2]];
    expect(路之權衡(囊, 輪椅, 1, 4, 4, 30, 450)).toBeNull();
  });

  it("繞之米不為負 —— 眾人之路必不長於己之路,微負者浮點之故", () => {
    const r = 路之權衡(造繞之囊(), 輪椅, 1, 4, 4, 30, 100);
    expect(r!.繞之米).toBe(0);
  });
});
