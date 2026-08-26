import { describe, it, expect, beforeEach } from "vitest";
import { fileURLToPath } from "node:url";
import { 開庫, type 庫, type 报 } from "../../src/frontend/src/data/本地庫";
import { 寫报, 讀报, 同步 } from "../../src/frontend/src/data/报事";

const wasm之地 = fileURLToPath(
  new URL("../../src/frontend/node_modules/sql.js/dist/", import.meta.url),
);

let db: 庫;
beforeEach(async () => {
  db = await 開庫({ 記憶中: true, wasm之路: wasm之地 });
});

const 一報: 报 = {
  id: "r1", city_id: "la", edge_id: 42,
  kind: "curb_cut_broken", note: "Cracked",
  status: "unverified", created_at: "2026-08-26T00:00:00Z",
};

const 成之供 = () => ({
  from: () => ({
    insert: async () => ({ error: null }),
    select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
  }),
});

describe("寫报", () => {
  it("無供給亦得寫,存於 local 而待同步", async () => {
    await 寫报(db, 一報, null);
    expect(await 讀报(db, "la")).toHaveLength(1);
    expect(await db.待同步之报()).toHaveLength(1);
  });

  it("remote 既成則不复待同步", async () => {
    await 寫报(db, 一報, 成之供() as never);
    expect(await db.待同步之报()).toHaveLength(0);
  });

  it("remote 敗則报犹在 local,且待同步", async () => {
    const 供 = { from: () => ({ insert: async () => ({ error: { message: "offline" } }) }) };
    await 寫报(db, 一報, 供 as never);
    expect(await 讀报(db, "la")).toHaveLength(1);
    expect(await db.待同步之报()).toHaveLength(1);
  });

  it("remote 舉錯亦不失其报 —— 网断正是人所欲报之时", async () => {
    const 供 = {
      from: () => ({ insert: async () => { throw new TypeError("Failed to fetch"); } }),
    };
    await 寫报(db, 一報, 供 as never);
    expect(await 讀报(db, "la")).toHaveLength(1);
    expect(await db.待同步之报()).toHaveLength(1);
  });
});

describe("讀报", () => {
  it("恆自 local 讀,不待網", async () => {
    await 寫报(db, 一報, null);
    expect(await 讀报(db, "la", 42)).toHaveLength(1);
  });
});

describe("同步", () => {
  it("無供給則不推不拉", async () => {
    await 寫报(db, 一報, null);
    expect(await 同步(db, "la", null)).toEqual({ 推: 0, 拉: 0 });
  });

  it("推待同步者而後標之", async () => {
    await 寫报(db, 一報, null);
    const r = await 同步(db, "la", 成之供() as never);
    expect(r.推).toBe(1);
    expect(await db.待同步之报()).toHaveLength(0);
  });

  it("拉 remote 之报而存之,不標待同步", async () => {
    const 遠 = [{ ...一報, id: "remote-1" }];
    const 供 = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({ order: async () => ({ data: 遠, error: null }) }),
        }),
      }),
    };
    const r = await 同步(db, "la", 供 as never);
    expect(r.拉).toBe(1);
    expect(await db.待同步之报()).toHaveLength(0);
    expect(await 讀报(db, "la")).toHaveLength(1);
  });

  it("拉之敗則 local 猶足用,不舉錯", async () => {
    await 寫报(db, 一報, null);
    const 供 = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ order: async () => { throw new Error("down"); } }) }),
      }),
    };
    const r = await 同步(db, "la", 供 as never);
    expect(r.推).toBe(1);
    expect(r.拉).toBe(0);
    expect(await 讀报(db, "la")).toHaveLength(1);
  });
});
