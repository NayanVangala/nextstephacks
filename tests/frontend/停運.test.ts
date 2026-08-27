import { describe, it, expect } from "vitest";
import {
  停運之狀, 取實時停運, 陳之限之毫秒,
} from "../../src/frontend/src/data/停運";
import type { CityPack } from "../../src/frontend/src/types";

function 造囊(停運?: unknown, 取於: string | null = null): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [], edges: [], destinations: [],
    canceled_service: 停運,
    canceled_service_fetched_at: 取於,
  } as unknown as CityPack;
}

const 今 = new Date("2026-08-24T12:00:00Z").getTime();
const 一囊 = { 總: 208, 路: { "720": 17 }, 更新於: "2022-10-04 15:56" };

describe("停運之狀", () => {
  it("無資則陳其無,而不作已無停運", () => {
    const s = 停運之狀(造囊(undefined, null), 今);
    expect(s.總).toBe(0);
    expect(s.有源).toBe(false);
  });

  it("其自稱之時甚舊者為陳", () => {
    // 此正洛城實況:應為二百,而其時乃二〇二二
    const s = 停運之狀(造囊(一囊, "2026-08-24T11:59:00Z"), 今);
    expect(s.總).toBe(208);
    expect(s.陳否).toBe(true);
  });

  it("取之雖新,而資自稱之時舊,猶為陳", () => {
    // 取之時新,不足以證其資新 —— 二者不可混
    const s = 停運之狀(造囊(一囊, "2026-08-24T11:59:59Z"), 今);
    expect(s.陳否).toBe(true);
  });

  it("資之時新者不為陳", () => {
    const 新 = { 總: 3, 路: { "2": 3 }, 更新於: "2026-08-24 11:40" };
    const s = 停運之狀(造囊(新, "2026-08-24T11:59:00Z"), 今);
    expect(s.陳否).toBe(false);
    expect(s.陳幾時).toBeLessThan(陳之限之毫秒);
  });

  it("時之文不可解者作陳,不作新", () => {
    const 壞 = { 總: 1, 路: {}, 更新於: "not-a-date" };
    expect(停運之狀(造囊(壞, "2026-08-24T11:59:00Z"), 今).陳否).toBe(true);
  });

  it("闕其時者作陳", () => {
    const 無時 = { 總: 1, 路: {}, 更新於: null };
    expect(停運之狀(造囊(無時, "2026-08-24T11:59:00Z"), 今).陳否).toBe(true);
  });

  it("路以停運之多寡序之", () => {
    const 多 = { 總: 40, 路: { "2": 3, "720": 17, "251": 14 }, 更新於: null };
    const s = 停運之狀(造囊(多, null), 今);
    expect(s.最甚.map((x) => x.路)).toEqual(["720", "251", "2"]);
  });
});

describe("取實時停運", () => {
  it("網敗回 null 而不舉錯", async () => {
    const 敗 = async () => { throw new TypeError("Failed to fetch"); };
    expect(await 取實時停運("http://x", 敗 as never)).toBeNull();
  });

  it("非二百之應回 null", async () => {
    const 壞 = async () => ({ ok: false, status: 503 }) as Response;
    expect(await 取實時停運("http://x", 壞)).toBeNull();
  });

  it("得其應則化為囊中之形", async () => {
    const 好 = async () => ({
      ok: true,
      json: async () => ({
        canceled_trips_summary: { "720": 17 },
        total_canceled_trips: 17,
        last_updated: "2026-08-24 11:40",
      }),
    }) as Response;
    const 出 = await 取實時停運("http://x", 好);
    expect(出!.總).toBe(17);
    expect(出!.更新於).toBe("2026-08-24 11:40");
  });
});

describe("時之解,當以 agency 之地時為準", () => {
  it("無時區之文,以洛城之時解之,不以 UTC", () => {
    // LA Metro 所出者乃太平洋時。夏令則 UTC-7。
    // 「2026-08-24 11:00」為 PDT,即 UTC 18:00。
    const 資 = { 總: 1, 路: {}, 更新於: "2026-08-24 11:00" };
    const 今 = new Date("2026-08-24T18:30:00Z").getTime(); // 其後半時
    const s = 停運之狀(造囊(資, "2026-08-24T18:30:00Z"), 今, "America/Los_Angeles");
    expect(s.陳幾時).toBeGreaterThan(0);
    expect(s.陳幾時).toBeLessThan(陳之限之毫秒); // 半時而已,未陳
    expect(s.陳否).toBe(false);
  });

  it("若誤以 UTC 解之,則半時之資反成七時半之陳", () => {
    const 資 = { 總: 1, 路: {}, 更新於: "2026-08-24 11:00" };
    const 今 = new Date("2026-08-24T18:30:00Z").getTime();
    const 正 = 停運之狀(造囊(資, null), 今, "America/Los_Angeles").陳幾時;
    const 誤 = 今 - Date.parse("2026-08-24T11:00:00Z");
    expect(誤 - 正).toBeCloseTo(7 * 60 * 60 * 1000, -3); // 七時之差
  });

  it("時區不授則仍以洛城為預設", () => {
    const 資 = { 總: 1, 路: {}, 更新於: "2026-08-24 11:00" };
    const 今 = new Date("2026-08-24T18:30:00Z").getTime();
    expect(停運之狀(造囊(資, null), 今).陳否).toBe(false);
  });
})
