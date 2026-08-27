import { describe, it, expect, beforeEach } from "vitest";
import { fileURLToPath } from "node:url";
import { 開庫, type 庫, type 报 } from "../src/data/本地庫";

// node 之中,WASM 取諸 node_modules;瀏覽器則取諸 /sql-wasm/(自本站,非 CDN)
const wasm之地 = fileURLToPath(
  new URL("../node_modules/sql.js/dist/", import.meta.url),
);

let db: 庫;

beforeEach(async () => {
  db = await 開庫({ 記憶中: true, wasm之路: wasm之地 });
});

const 一報: 报 = {
  id: "r1", city_id: "la", edge_id: 42,
  kind: "curb_cut_broken", note: "Kerb is cracked",
  status: "unverified", created_at: "2026-08-26T00:00:00Z",
};

describe("本地庫", () => {
  it("增而後可取", async () => {
    await db.增报(一報);
    const 出 = await db.取报("la");
    expect(出).toHaveLength(1);
    expect(出[0].edge_id).toBe(42);
  });

  it("可按段而取", async () => {
    await db.增报(一報);
    await db.增报({ ...一報, id: "r2", edge_id: 99 });
    expect(await db.取报("la", 42)).toHaveLength(1);
    expect(await db.取报("la", 99)).toHaveLength(1);
  });

  it("异城之报不相混", async () => {
    await db.增报(一報);
    expect(await db.取报("phx")).toHaveLength(0);
  });

  it("新增者皆待同步", async () => {
    await db.增报(一報);
    expect(await db.待同步之报()).toHaveLength(1);
  });

  it("既標則不复待同步,而报犹在", async () => {
    await db.增报(一報);
    await db.標已同步(["r1"]);
    expect(await db.待同步之报()).toHaveLength(0);
    expect(await db.取报("la")).toHaveLength(1);
  });

  it("同 id 再增则不重", async () => {
    await db.增报(一報);
    await db.增报(一報);
    expect(await db.取报("la")).toHaveLength(1);
  });

  it("自 remote 来者不待同步", async () => {
    await db.增报({ ...一報, id: "r3" }, { 自remote: true });
    expect(await db.待同步之报()).toHaveLength(0);
  });

  it("status 原样存之,不擅改", async () => {
    await db.增报({ ...一報, id: "r4", status: "confirmed" });
    const 出 = await db.取报("la");
    expect(出.find((x) => x.id === "r4")!.status).toBe("confirmed");
  });

  it("note 可闕", async () => {
    await db.增报({ ...一報, id: "r5", note: null });
    expect((await db.取报("la"))[0].note).toBeNull();
  });

  it("標空列不舉錯", async () => {
    await expect(db.標已同步([])).resolves.toBeUndefined();
  });
});
