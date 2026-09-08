import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * migration 之測,行於真 postgres(PGlite,in-process)。
 *
 * 此測之立,以其所發者也:20260827 之 migration 意在去舊之寬政而代以嚴者,
 * 而所 drop 者名「报事_众可插」,所建者名「报事_众可增」—— 一字之差。
 * **postgres 於同命之 RLS 政以「或」合之**,故寬者存而勝,
 * 登入之人遂得以他人之 uuid 插报。其 migration 之註自言所防者,正未防也。
 *
 * 讀其 SQL 不能見之。必行之於真庫,而後其政之實可驗。
 *
 * This exists because of what it found. The 20260827 migration meant to replace
 * a permissive insert policy with a strict one, but dropped "报事_众可插" while
 * the original created "报事_众可增" — one character apart. POSTGRES OR-COMBINES
 * RLS POLICIES FOR THE SAME COMMAND, so the permissive one survived and won: a
 * signed-in user could file reports attributed to any other account. The
 * migration's own comment claimed to prevent exactly that.
 *
 * Reading the SQL cannot catch this. Only running it can.
 */

const 遷之處 = fileURLToPath(new URL("../../../supabase/migrations", import.meta.url));

const ALICE = "11111111-1111-1111-1111-111111111111";
const MALLORY = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

/** supabase 之境所具而 PGlite 無者。立其最小之形。 */
const 摹supabase = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable
    as $$ select null::uuid $$;
  do $$ begin
    if not exists (select from pg_roles where rolname='anon') then create role anon; end if;
    if not exists (select from pg_roles where rolname='authenticated') then create role authenticated; end if;
  end $$;
`;

async function 為(uid: string | null) {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid ? `'${uid}'::uuid` : "null::uuid"
    } $$;`,
  );
}

/** 以某角行一語。回其成敗,不擲。 */
async function 試(role: "anon" | "authenticated", sql: string): Promise<boolean> {
  await db.exec(`set role ${role}`);
  try {
    await db.exec(sql);
    return true;
  } catch {
    return false;
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(摹supabase);
  // 依名之序而行,與 supabase db push 同。
  for (const f of readdirSync(遷之處).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(遷之處, f), "utf8"));
  }
  await db.exec(`insert into auth.users(id) values ('${ALICE}'),('${MALLORY}')`);
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, delete on 报事 to authenticated;
    grant select, insert on 报事 to anon;
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("migration 皆可行於真 postgres", () => {
  it("其表既立,而 RLS 已啟", async () => {
    const r = await db.query<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where relname = '报事'`,
    );
    expect(r.rows[0]?.relrowsecurity).toBe(true);
  });

  it("reporter_id 可為 null —— 匿名之报,非缺漏", async () => {
    const r = await db.query<{ is_nullable: string }>(
      `select is_nullable from information_schema.columns
       where table_name='报事' and column_name='reporter_id'`,
    );
    expect(r.rows[0]?.is_nullable).toBe("YES");
  });

  it("無 UPDATE 之政 —— 报既驗而其文可易,則其驗無憑", async () => {
    const r = await db.query(
      `select policyname from pg_policies where tablename='报事' and cmd='UPDATE'`,
    );
    expect(r.rows).toHaveLength(0);
  });
});

describe("插之政 —— 其寬者必去", () => {
  it("舊之寬政不存。存則其嚴政為所破", async () => {
    const r = await db.query(
      `select policyname from pg_policies where tablename='报事' and policyname='报事_众可增'`,
    );
    expect(r.rows).toHaveLength(0);
  });

  it("凡 INSERT 之政,皆限其 reporter_id —— 一政不限,則諸政俱虛", async () => {
    const r = await db.query<{ policyname: string; with_check: string }>(
      `select policyname, with_check from pg_policies
       where tablename='报事' and cmd='INSERT'`,
    );
    expect(r.rows.length).toBeGreaterThan(0);
    for (const p of r.rows) {
      expect(
        p.with_check,
        `policy ${p.policyname} does not constrain reporter_id; ` +
          `postgres ORs INSERT policies, so this one alone re-opens impersonation`,
      ).toMatch(/reporter_id/);
    }
  });
});

describe("其行之實", () => {
  it("匿名者得报,而不得託名於人", async () => {
    await 為(null);
    expect(await 試("anon",
      `insert into 报事 (city_id,edge_id,kind) values ('la',101,'sidewalk_blocked')`)).toBe(true);
    expect(await 試("anon",
      `insert into 报事 (city_id,edge_id,kind,reporter_id) values ('la',102,'other','${ALICE}')`)).toBe(false);
  });

  it("七城皆可报 —— 舊政但許洛城", async () => {
    await 為(null);
    for (const c of ["la", "sea", "phx", "nyc", "chi", "sfo", "mia"]) {
      expect(await 試("anon",
        `insert into 报事 (city_id,edge_id,kind) values ('${c}',200,'no_shade')`),
        `city ${c} rejected`).toBe(true);
    }
  });

  it("登入者得报以己名", async () => {
    await 為(MALLORY);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,reporter_id) values ('la',103,'other','${MALLORY}')`)).toBe(true);
  });

  it("登入者不得以他人之名报 —— 此測所由立也", async () => {
    await 為(MALLORY);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,reporter_id) values ('la',104,'other','${ALICE}')`)).toBe(false);
  });

  it("登入者亦得匿名而报", async () => {
    await 為(MALLORY);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind) values ('la',105,'other')`)).toBe(true);
  });

  it("表態可插 —— confirmed/disputed 必達,否則其报永不出未驗之境", async () => {
    await 為(MALLORY);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,status,reporter_id)
       values ('la',106,'other','confirmed','${MALLORY}')`)).toBe(true);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,status,reporter_id)
       values ('la',107,'other','disputed','${MALLORY}')`)).toBe(true);
  });

  it("一人於一段,一態一次", async () => {
    await 為(MALLORY);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,status,reporter_id)
       values ('la',108,'other','confirmed','${MALLORY}')`)).toBe(true);
    expect(await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,status,reporter_id)
       values ('la',108,'other','confirmed','${MALLORY}')`)).toBe(false);
  });

  it("註逾五百者拒之 —— 舊政去而其限存於 CHECK", async () => {
    await 為(null);
    expect(await 試("anon",
      `insert into 报事 (city_id,edge_id,kind,note) values ('la',109,'other','${"x".repeat(501)}')`)).toBe(false);
    expect(await 試("anon",
      `insert into 报事 (city_id,edge_id,kind,note) values ('la',110,'other','${"x".repeat(500)}')`)).toBe(true);
  });

  it("己之报可自删,他人之报不可", async () => {
    await 為(ALICE);
    await 試("authenticated",
      `insert into 报事 (city_id,edge_id,kind,reporter_id) values ('la',111,'other','${ALICE}')`);
    await 為(MALLORY);
    expect(await 試("authenticated", `delete from 报事 where edge_id=111`)).toBe(true);
    // 政雖許其行,而 using 之限使其無所刪 —— 故其列猶存。
    const r = await db.query(`select 1 from 报事 where edge_id=111`);
    expect(r.rows, "Mallory deleted Alice's report").toHaveLength(1);
  });
});


describe("限速 —— 其防在庫,不在頁", () => {
  /*
    页之防(蜜之器、载后二秒)所御者浅:其後之 API 众所可叩,一 script
    不载此页而直插者,前防皆不及。故此測所验者,乃其真所在之限。
    The client-side honeypot cannot be tested here because it is not what
    protects anything: the REST endpoint accepts inserts from scripts that
    never load the page. This tests the bound that actually holds.
  */

  /** 每測自用一段,免相染。 */
  let 段 = 9000;
  const 新段 = () => ++段;

  it("一段一時之內,匿名者不過五报", async () => {
    const e = 新段();
    await 為(null);
    for (let i = 0; i < 5; i++) {
      expect(
        await 試("anon", `insert into 报事(city_id,edge_id,kind) values ('la',${e},'other')`),
      ).toBe(true);
    }
    // 第六者當拒。
    expect(
      await 試("anon", `insert into 报事(city_id,edge_id,kind) values ('la',${e},'other')`),
    ).toBe(false);
  });

  it("其限系於一段,非於一城 —— 他段仍可报", async () => {
    const a = 新段();
    const b = 新段();
    await 為(null);
    for (let i = 0; i < 5; i++) {
      await 試("anon", `insert into 报事(city_id,edge_id,kind) values ('la',${a},'other')`);
    }
    expect(
      await 試("anon", `insert into 报事(city_id,edge_id,kind) values ('la',${a},'other')`),
    ).toBe(false);
    expect(
      await 試("anon", `insert into 报事(city_id,edge_id,kind) values ('la',${b},'other')`),
    ).toBe(true);
  });

  it("登入者亦受段之限 —— 不可以登入而破之", async () => {
    const e = 新段();
    await 為(ALICE);
    for (let i = 0; i < 5; i++) {
      await 試("authenticated",
        `insert into 报事(city_id,edge_id,kind,reporter_id) values ('la',${e},'other','${ALICE}')`);
    }
    expect(
      await 試("authenticated",
        `insert into 报事(city_id,edge_id,kind,reporter_id) values ('la',${e},'other','${ALICE}')`),
    ).toBe(false);
  });

  it("屬人之限:一人一時不過二十,雖遍歷諸段亦然", async () => {
    // 別立一人。ALICE 與 MALLORY 於前測已有其报,則其數不自零起。
    // A dedicated account: ALICE and MALLORY already carry reports from earlier
    // tests in this file, so their hourly count does not start at zero.
    const 新人 = "33333333-3333-3333-3333-333333333333";
    await db.exec(`insert into auth.users(id) values ('${新人}') on conflict do nothing`);
    await 為(新人);
    // 二十报,每报一段 —— 段之限不與焉,所驗者人之限。
    for (let i = 0; i < 20; i++) {
      const ok = await 試("authenticated",
        `insert into 报事(city_id,edge_id,kind,reporter_id) values ('la',${新段()},'other','${新人}')`);
      expect(ok).toBe(true);
    }
    expect(
      await 試("authenticated",
        `insert into 报事(city_id,edge_id,kind,reporter_id) values ('la',${新段()},'other','${新人}')`),
    ).toBe(false);
  });

  it("其函之 search_path 已釘 —— 未釘者,SECURITY DEFINER 即升權之階", async () => {
    const r = await db.query<{ proname: string; proconfig: string[] | null }>(
      `select proname, proconfig from pg_proc
       where proname in ('报事_段之近数','报事_人之近数')`,
    );
    expect(r.rows).toHaveLength(2);
    for (const f of r.rows) {
      expect(f.proconfig?.some((c) => c.startsWith("search_path="))).toBe(true);
    }
  });

  it("凡 INSERT 之政皆載其限 —— 一政不載,則諸政俱虛(政以「或」合)", async () => {
    const r = await db.query<{ policyname: string; with_check: string }>(
      `select policyname, with_check from pg_policies
       where tablename='报事' and cmd='INSERT'`,
    );
    expect(r.rows.length).toBeGreaterThan(0);
    for (const p of r.rows) {
      expect(p.with_check).toContain("段之近数");
    }
  });
});
