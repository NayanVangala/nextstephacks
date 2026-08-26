# Passable 之四:報事之層(Supabase + SQLite + ChromaDB)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 立「報事」之層 —— 人得報路之障(緣石之壞、道之阻、納涼之所已閉),存於 Supabase;於瀏覽器則以 SQLite(WASM)為local之鏡,俾網斷猶可讀可寫;ChromaDB 索其文,以應自然之問。

**Architecture:** 三者各有其職,不相掩:

| 物 | 職 | 何以必需 |
|---|---|---|
| Supabase(Postgres) | 報事之durable store,多人共之,以 RLS 護之 | 今之architecture獨不能為者,唯此 |
| SQLite(WASM,在瀏覽器) | 報事之local鏡;網斷則讀local,復網則同步 | 此正所以**保**「離網可用」之旨,非破之 |
| ChromaDB | 報事之文與destination之述,以embedding索之,應自然之問 | 報事既立,方有corpus可索;前此無文可索,故無所用 |

報事者,keystone也。無之,則 SQLite 無所鏡,ChromaDB 無所索。

**Tech Stack:** Supabase(Postgres 15 + RLS);`@supabase/supabase-js`;`wa-sqlite` 或 `sql.js`(WASM);Python `chromadb`(PersistentClient,不需 Docker);既有之 Python 3.14 pipeline 與 React 19 前端。

**Spec:** `docs/superpowers/specs/2026-08-23-passable-design.md`

**Predecessors:** Plans 1-3(第零至七階)

---

## 先決之礙(Blockers — 須用戶親為)

**此二事,吾不能代為:**

1. **Docker 未裝。** `supabase start`(local dev stack)全賴之。
2. **Supabase 之 cloud 需 OAuth**,而此 session 非交互,不能行其flow。

故 Task 1 但**寫**其 schema、RLS、migration 之 SQL,而**不**施之。用戶既得 project,則一命而畢:

```bash
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

於此之前,前端以 `VITE_SUPABASE_URL` 之有無為斷:無則入**local-only之模**,報事但存於 SQLite,而界面明告「未同步」。**此非降級之權宜,乃第一等之path** —— 蓋離網可用,本為此物之旨。

## 全局之約(Global Constraints)

- **離網可用不可破。** 路徑之算恆在client,不賴任何server。報事之層為**增**,非為routing之所賴。Supabase 若不可達,routing 須全然如故。
- **`edgeCost >= edge.length_m` 之不變式不可破。** 報事可致某段之被避,然其法為**增其罰**,不得減其值。
- **匿名之報,不收私。** 不錄 IP、不錄裝置之識、不錄精確之居所。報事但繫於段之 id。
- **未驗之報不得冒為實。** 報事有 `status`:`unverified` | `confirmed` | `disputed`。界面必著之。此與 `confidence`、`backup_power` 同一理:不知者不得謂之知。
- **secrets 不入 repo。** `.env.local` 入 `.gitignore`;`anon key` 雖為public,亦置於 env,不硬寫於碼。
- **界面之文用英文**;註、識別子、commit 用中文。
- **每 task 既成即 commit**,直在 `main`。

---

## 檔之布局

```
supabase/
├── config.toml
└── migrations/
    └── 20260824000000_报事.sql      # schema + RLS + index

src/backend/pipeline/
└── 索引/
    ├── __init__.py
    └── 建索引.py                     # ChromaDB PersistentClient,索destination與报事之文

src/frontend/src/
├── data/供給.ts                      # Supabase client(或 null,若無 env)
├── data/本地庫.ts                    # SQLite WASM:建表、讀、寫、待同步之列
├── data/报事.ts                      # 报事之API:寫則先local後remote,讀則先local
├── components/报事表.tsx             # 提報之form
├── components/报事列.tsx             # 一段之报事
└── hooks/用报事.ts                   # React hook:載入、同步、狀態

config/
└── .env.example
```

---

## Task 1:Supabase 之 schema、RLS、migration

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260824000000_报事.sql`
- Create: `config/.env.example`
- Modify: `.gitignore`

**Interfaces:**
- 表 `报事`(reports)之欄:`id, edge_id, city_id, kind, note, status, created_at`
- `kind` ∈ `curb_cut_broken | sidewalk_blocked | no_shade | closed_facility | other`
- `status` ∈ `unverified | confirmed | disputed`,default `unverified`
- RLS:anon 得 `select` 與 `insert`,不得 `update`/`delete`

**不施之。** 此 task 但寫其 SQL 而驗其syntax。

- [ ] **Step 1: 立 supabase 之骨**

Run:
```bash
cd /Users/nayanvangala/nextstephacks && npx supabase init --force
```
Expected: 生 `supabase/config.toml` 與 `supabase/migrations/`。

- [ ] **Step 2: 寫 migration**

`supabase/migrations/20260824000000_报事.sql`:
```sql
-- 报事:人所报路之障。匿名而不收私。
-- Anonymous by design: no IP, no device id, no precise home location. A report
-- binds to a sidewalk EDGE, never to a person.

create type 报事之类 as enum (
  'curb_cut_broken',
  'sidewalk_blocked',
  'no_shade',
  'closed_facility',
  'other'
);

-- 未验之报不得冒为实。default 为 unverified,界面必著之。
create type 报事之状 as enum ('unverified', 'confirmed', 'disputed');

create table if not exists 报事 (
  id          uuid primary key default gen_random_uuid(),
  city_id     text not null,
  edge_id     bigint not null,
  kind        报事之类 not null,
  note        text check (char_length(note) <= 500),
  status      报事之状 not null default 'unverified',
  created_at  timestamptz not null default now()
);

-- 依城与段而查,故索之。
create index if not exists 报事_城段_idx on 报事 (city_id, edge_id);
create index if not exists 报事_时_idx on 报事 (created_at desc);

alter table 报事 enable row level security;

-- anon 得读。报事本为公器,无所隐。
create policy "报事_众可读" on 报事
  for select using (true);

-- anon 得写,然不得改、不得删 —— 免一人抹众人之报。
create policy "报事_众可增" on 报事
  for insert with check (
    char_length(coalesce(note, '')) <= 500
    and city_id in ('la')
  );
```

**注:** 無 `update`、`delete` 之 policy,則 RLS 默拒之。此為所欲 —— 匿名者不得抹他人之报。改状之权,他日以 service role 或 moderator 之角為之。

- [ ] **Step 3: 驗其 SQL 之 syntax**

Run:
```bash
cd /Users/nayanvangald/nextstephacks 2>/dev/null || cd /Users/nayanvangala/nextstephacks
npx supabase db lint --schema public 2>&1 | tail -20 || echo "lint 需 local stack(Docker);syntax 之驗俟用戶 db push"
```
若 Docker 未備而不能 lint,則以 `python3 -c` 粗驗其括號與分號之數,並記「syntax 未經 Postgres 之驗」於此 task 之下。**不得謂之已驗。**

- [ ] **Step 4: 寫 `.env.example` 而護其實**

`config/.env.example`:
```bash
# Supabase。無此二者,则 app 入 local-only 之模 —— 此非坏,routing 本不赖之。
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

於 `.gitignore` 增:
```gitignore
.env
.env.local
src/frontend/.env
src/frontend/.env.local
```

anon key 雖為 public(其权由 RLS 所限),亦不硬写于码。

- [ ] **Step 5: Commit**

```bash
git add supabase config/.env.example .gitignore
git commit -m "feat: 立报事之 schema 与 RLS(未施于 Supabase,俟用户 db push)"
```

---

## Task 2:SQLite(WASM)之 local 库

**Files:**
- Create: `src/frontend/src/data/本地庫.ts`
- Test: `tests/frontend/本地庫.test.ts`

**Interfaces:**
- `開庫() -> Promise<庫>` — 啟 WASM,建表(若未有)
- `庫.增报(报) -> Promise<void>` — 寫 local,並標 `待同步 = 1`
- `庫.取报(city_id, edge_id?) -> Promise<报[]>`
- `庫.待同步之报() -> Promise<报[]>`
- `庫.標已同步(ids) -> Promise<void>`

用 `sql.js`(WASM,無需 server)。庫存於 IndexedDB 之 blob,俾重載猶在。

- [ ] **Step 1: 裝 sql.js**

Run:
```bash
cd src/frontend && npm install sql.js && npm install -D @types/sql.js
```

- [ ] **Step 2: 先寫必敗之試**

`tests/frontend/本地庫.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { 開庫, type 庫 } from "../../src/frontend/src/data/本地庫";

let db: 庫;

beforeEach(async () => {
  db = await 開庫({ 記憶中: true });  // 試不觸 IndexedDB
});

const 一報 = {
  id: "r1", city_id: "la", edge_id: 42,
  kind: "curb_cut_broken" as const, note: "Kerb is cracked",
  status: "unverified" as const, created_at: "2026-08-24T00:00:00Z",
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

  it("既標則不复待同步", async () => {
    await db.增报(一報);
    await db.標已同步(["r1"]);
    expect(await db.待同步之报()).toHaveLength(0);
    expect(await db.取报("la")).toHaveLength(1);  // 报犹在,但不待同步
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
});
```

- [ ] **Step 3: 運試以驗其敗**

Run: `cd src/frontend && npx vitest run 本地庫`
Expected: FAIL — 無此 module

- [ ] **Step 4: 寫其實作**

`src/frontend/src/data/本地庫.ts`:
```typescript
import initSqlJs, { type Database } from "sql.js";

export interface 报 {
  id: string;
  city_id: string;
  edge_id: number;
  kind: "curb_cut_broken" | "sidewalk_blocked" | "no_shade" | "closed_facility" | "other";
  note: string | null;
  status: "unverified" | "confirmed" | "disputed";
  created_at: string;
}

const 建表之語 = `
  create table if not exists 报事 (
    id text primary key,
    city_id text not null,
    edge_id integer not null,
    kind text not null,
    note text,
    status text not null default 'unverified',
    created_at text not null,
    待同步 integer not null default 1
  );
  create index if not exists 报事_城段 on 报事 (city_id, edge_id);
`;

const 存之鑰 = "passable.报事.db";

export interface 庫 {
  增报(r: 报, opts?: { 自remote?: boolean }): Promise<void>;
  取报(city_id: string, edge_id?: number): Promise<报[]>;
  待同步之报(): Promise<报[]>;
  標已同步(ids: string[]): Promise<void>;
}

/**
 * 開 local 之庫。
 *
 * This is what keeps "works offline" true once reports exist: reads never
 * require the network, and writes queue locally until it returns.
 */
export async function 開庫(opts: { 記憶中?: boolean } = {}): Promise<庫> {
  const SQL = await initSqlJs({
    // WASM 隨 bundle 而來,不取諸 CDN —— 離網可用之故。
    locateFile: (f: string) => `/sql-wasm/${f}`,
  });

  let db: Database;
  const 舊 = opts.記憶中 ? null : localStorage.getItem(存之鑰);
  if (舊) {
    const 位元 = Uint8Array.from(atob(舊), (c) => c.charCodeAt(0));
    db = new SQL.Database(位元);
  } else {
    db = new SQL.Database();
  }
  db.run(建表之語);

  const 存 = () => {
    if (opts.記憶中) return;
    const 位元 = db.export();
    let s = "";
    for (const b of 位元) s += String.fromCharCode(b);
    localStorage.setItem(存之鑰, btoa(s));
  };

  const 列為报 = (row: unknown[]): 报 => ({
    id: row[0] as string,
    city_id: row[1] as string,
    edge_id: row[2] as number,
    kind: row[3] as 报["kind"],
    note: row[4] as string | null,
    status: row[5] as 报["status"],
    created_at: row[6] as string,
  });

  const 查 = (sql: string, 參: unknown[]): 报[] => {
    const st = db.prepare(sql);
    st.bind(參 as never);
    const 出: 报[] = [];
    while (st.step()) 出.push(列為报(st.get() as unknown[]));
    st.free();
    return 出;
  };

  return {
    async 增报(r, o = {}) {
      db.run(
        `insert or ignore into 报事
         (id, city_id, edge_id, kind, note, status, created_at, 待同步)
         values (?,?,?,?,?,?,?,?)`,
        [r.id, r.city_id, r.edge_id, r.kind, r.note, r.status, r.created_at,
         o.自remote ? 0 : 1] as never,
      );
      存();
    },
    async 取报(city_id, edge_id) {
      return edge_id === undefined
        ? 查(`select id,city_id,edge_id,kind,note,status,created_at
               from 报事 where city_id = ? order by created_at desc`, [city_id])
        : 查(`select id,city_id,edge_id,kind,note,status,created_at
               from 报事 where city_id = ? and edge_id = ? order by created_at desc`,
             [city_id, edge_id]);
    },
    async 待同步之报() {
      return 查(`select id,city_id,edge_id,kind,note,status,created_at
                 from 报事 where 待同步 = 1 order by created_at asc`, []);
    },
    async 標已同步(ids) {
      if (ids.length === 0) return;
      const 問 = ids.map(() => "?").join(",");
      db.run(`update 报事 set 待同步 = 0 where id in (${問})`, ids as never);
      存();
    },
  };
}
```

- [ ] **Step 5: 置 WASM 於 public**

Run:
```bash
cd src/frontend && mkdir -p public/sql-wasm && cp node_modules/sql.js/dist/sql-wasm.wasm public/sql-wasm/
```
**必自 bundle 而來,不得取諸 CDN** —— 否則離網即敗。

- [ ] **Step 6: 運試以驗其成**

Run: `cd src/frontend && npx vitest run 本地庫`
Expected: PASS(8 試)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 立 SQLite(WASM)之 local 庫,俾报事离网可读可写"
```

---

## Task 3:Supabase client 與报事之 API

**Files:**
- Create: `src/frontend/src/data/供給.ts`
- Create: `src/frontend/src/data/报事.ts`
- Test: `tests/frontend/报事.test.ts`

**Interfaces:**
- `得供給() -> SupabaseClient | null` — 無 env 則 null
- `寫报(庫, 报) -> Promise<void>` — **先 local,後 remote**;remote 敗則留待同步
- `讀报(庫, city_id, edge_id?) -> Promise<报[]>` — **恆自 local 讀**
- `同步(庫, city_id) -> Promise<{推: number, 拉: number}>` — 推待同步者,拉 remote 之新者

**次序至要:** 寫必先 local。若先 remote,則網斷時報即失。

- [ ] **Step 1: 裝 supabase-js**

Run: `cd src/frontend && npm install @supabase/supabase-js`

- [ ] **Step 2: 先寫必敗之試**

`tests/frontend/报事.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { 開庫, type 庫 } from "../../src/frontend/src/data/本地庫";
import { 寫报, 讀报, 同步 } from "../../src/frontend/src/data/报事";

let db: 庫;
beforeEach(async () => { db = await 開庫({ 記憶中: true }); });

const 一報 = {
  id: "r1", city_id: "la", edge_id: 42,
  kind: "curb_cut_broken" as const, note: "Cracked",
  status: "unverified" as const, created_at: "2026-08-24T00:00:00Z",
};

describe("寫报", () => {
  it("無供給亦得寫,存於 local 而待同步", async () => {
    await 寫报(db, 一報, null);
    expect(await 讀报(db, "la")).toHaveLength(1);
    expect(await db.待同步之报()).toHaveLength(1);
  });

  it("remote 既成則不复待同步", async () => {
    const 供 = { from: () => ({ insert: async () => ({ error: null }) }) };
    await 寫报(db, 一報, 供 as never);
    expect(await db.待同步之报()).toHaveLength(0);
  });

  it("remote 敗則报犹在 local,且待同步", async () => {
    const 供 = { from: () => ({ insert: async () => ({ error: { message: "offline" } }) }) };
    await 寫报(db, 一報, 供 as never);
    expect(await 讀报(db, "la")).toHaveLength(1);
    expect(await db.待同步之报()).toHaveLength(1);
  });

  it("remote 舉錯亦不失其报", async () => {
    const 供 = { from: () => ({ insert: async () => { throw new TypeError("Failed to fetch"); } }) };
    await 寫报(db, 一報, 供 as never);
    expect(await 讀报(db, "la")).toHaveLength(1);
  });
});

describe("讀报", () => {
  it("恆自 local 讀,不待網", async () => {
    await 寫报(db, 一報, null);
    const 出 = await 讀报(db, "la", 42);
    expect(出).toHaveLength(1);
  });
});

describe("同步", () => {
  it("無供給則不推不拉", async () => {
    await 寫报(db, 一報, null);
    expect(await 同步(db, "la", null)).toEqual({ 推: 0, 拉: 0 });
  });

  it("推待同步者而後標之", async () => {
    await 寫报(db, 一報, null);
    const 供 = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };
    const r = await 同步(db, "la", 供 as never);
    expect(r.推).toBe(1);
    expect(await db.待同步之报()).toHaveLength(0);
  });

  it("拉 remote 之报而存之,不標待同步", async () => {
    const 遠 = [{ ...一報, id: "remote-1" }];
    const 供 = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ order: async () => ({ data: 遠, error: null }) }) }),
      }),
    };
    const r = await 同步(db, "la", 供 as never);
    expect(r.拉).toBe(1);
    expect(await db.待同步之报()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 運試以驗其敗**

Run: `cd src/frontend && npx vitest run 报事`
Expected: FAIL — 無此 module

- [ ] **Step 4: 寫其實作**

`src/frontend/src/data/供給.ts`:
```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 得 Supabase 之 client,無 env 則 null。
 *
 * A null client is a FIRST-CLASS state, not an error: routing never depended on
 * the network, and reports fall back to local-only. The UI says "not synced",
 * and everything else keeps working.
 */
export function 得供給(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
```

`src/frontend/src/data/报事.ts`:
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { 庫, 报 } from "./本地庫";

const 表 = "报事";

/**
 * 寫一报。
 *
 * ORDER MATTERS: local first, remote second. Writing remote first would lose
 * the report entirely when the network is down — which is exactly when someone
 * is most likely to be reporting a blocked sidewalk.
 */
export async function 寫报(
  db: 庫,
  r: 报,
  供: SupabaseClient | null,
): Promise<void> {
  await db.增报(r);
  if (!供) return;
  try {
    const { error } = await 供.from(表).insert({
      id: r.id, city_id: r.city_id, edge_id: r.edge_id,
      kind: r.kind, note: r.note, created_at: r.created_at,
    });
    if (!error) await db.標已同步([r.id]);
  } catch {
    // 網斷、CORS、任何之敗 —— 报犹在 local 而待同步
  }
}

/** 讀报。恆自 local,故網斷無妨。 */
export async function 讀报(db: 庫, city_id: string, edge_id?: number) {
  return db.取报(city_id, edge_id);
}

/** 推待同步者,拉 remote 之新者。 */
export async function 同步(
  db: 庫,
  city_id: string,
  供: SupabaseClient | null,
): Promise<{ 推: number; 拉: number }> {
  if (!供) return { 推: 0, 拉: 0 };

  let 推 = 0;
  const 待 = await db.待同步之报();
  for (const r of 待) {
    try {
      const { error } = await 供.from(表).insert({
        id: r.id, city_id: r.city_id, edge_id: r.edge_id,
        kind: r.kind, note: r.note, created_at: r.created_at,
      });
      if (!error) { await db.標已同步([r.id]); 推 += 1; }
    } catch { /* 留待下次 */ }
  }

  let 拉 = 0;
  try {
    const { data, error } = await 供.from(表)
      .select("id,city_id,edge_id,kind,note,status,created_at")
      .eq("city_id", city_id)
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      for (const r of data as 报[]) {
        await db.增报(r, { 自remote: true });
        拉 += 1;
      }
    }
  } catch { /* 拉之不得,local 猶足用 */ }

  return { 推, 拉 };
}
```

- [ ] **Step 5: 運試以驗其成**

Run: `cd src/frontend && npx vitest run 报事`
Expected: PASS(9 試)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 立报事之 API —— 先 local 後 remote,网断不失其报"
```

---

## Task 4:报事之界面,與路值之增罰

**Files:**
- Create: `src/frontend/src/components/报事表.tsx`
- Create: `src/frontend/src/components/报事列.tsx`
- Create: `src/frontend/src/hooks/用报事.ts`
- Modify: `src/frontend/src/routing/cost.ts`
- Modify: `src/frontend/src/views/RouteView.tsx`
- Test: `tests/frontend/cost.test.ts`(增)

**Interfaces:**
- `用报事(city_id)` — hook,回 `{报, 寫, 同步中, 已同步, 供給有無}`
- `edgeCost` 增一 optional 之參:`报之罰: Map<number, number>`(edge_id → 罰值)

**罰而不減。** 一段有未验之报,則**增**其值,不得減他段之值 —— `cost >= length_m` 之不變式賴之。

- [ ] **Step 1: 先寫必敗之試**

於 `tests/frontend/cost.test.ts` 增:
```typescript
describe("报事之罚", () => {
  it("有报之段其值增", () => {
    const e = edge();
    const 罰 = new Map([[e.id, 300]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeGreaterThan(edgeCost(e, NONE, 4, 20));
  });

  it("无报之段不受累", () => {
    const e = edge();
    const 罰 = new Map([[999, 300]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeCloseTo(edgeCost(e, NONE, 4, 20), 6);
  });

  it("虽有报,其值犹不小于其长 —— 不变式不破", () => {
    const e = edge();
    const 罰 = new Map([[e.id, 300]]);
    expect(edgeCost(e, NONE, 4, 20, 罰)).toBeGreaterThanOrEqual(e.length_m);
  });

  it("不授罚则如故", () => {
    const e = edge();
    expect(edgeCost(e, NONE, 4, 20, undefined)).toBeCloseTo(edgeCost(e, NONE, 4, 20), 6);
  });
});
```

- [ ] **Step 2: 改 `edgeCost`**

於 `src/frontend/src/routing/cost.ts` 之末改其簽名:
```typescript
export function edgeCost(
  edge: Edge,
  flags: ProfileFlags,
  hourIdx: number,
  tempC: number,
  报之罰?: Map<number, number>,
): number {
```
於 `return` 之前增:
```typescript
  // 报事之罚:增之,不减他段 —— cost >= length_m 之不变式赖此。
  const 报罰 = 报之罰?.get(edge.id) ?? 0;
```
而 `return` 改為:
```typescript
  return edge.length_m * heatMult * surfaceFactor + slope + crossing + 报罰;
```

- [ ] **Step 3: 運試以驗其成**

Run: `cd src/frontend && npx vitest run cost`
Expected: PASS —— 舊之 admissibility 之試須猶綠。

- [ ] **Step 4: 寫 hook**

`src/frontend/src/hooks/用报事.ts`:
```typescript
import { useCallback, useEffect, useState } from "react";
import { 開庫, type 庫, type 报 } from "../data/本地庫";
import { 得供給 } from "../data/供給";
import { 寫报, 讀报, 同步 } from "../data/报事";

const 供 = 得供給();

export function 用报事(city_id: string) {
  const [db, setDb] = useState<庫 | null>(null);
  const [报列, set报列] = useState<报[]>([]);
  const [同步中, set同步中] = useState(false);

  useEffect(() => {
    開庫().then(async (d) => {
      setDb(d);
      set报列(await 讀报(d, city_id));
      if (供) {
        set同步中(true);
        await 同步(d, city_id, 供);
        set报列(await 讀报(d, city_id));
        set同步中(false);
      }
    });
  }, [city_id]);

  const 寫 = useCallback(async (r: 报) => {
    if (!db) return;
    await 寫报(db, r, 供);
    set报列(await 讀报(db, city_id));
  }, [db, city_id]);

  return { 报列, 寫, 同步中, 供給有無: 供 !== null };
}
```

- [ ] **Step 5: 寫 `报事表` 與 `报事列`**

`src/frontend/src/components/报事表.tsx`(界面之文用英文):
```tsx
import { useState } from "react";
import type { 报 } from "../data/本地庫";

const 類之文: { v: 报["kind"]; label: string }[] = [
  { v: "curb_cut_broken", label: "Curb cut broken or missing" },
  { v: "sidewalk_blocked", label: "Sidewalk blocked" },
  { v: "no_shade", label: "No shade where the map shows some" },
  { v: "closed_facility", label: "Cooling centre closed" },
  { v: "other", label: "Something else" },
];

export function 报事表({
  city_id, edge_id, onSubmit,
}: {
  city_id: string;
  edge_id: number;
  onSubmit: (r: 报) => void;
}) {
  const [kind, setKind] = useState<报["kind"]>("curb_cut_broken");
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit({
          id: crypto.randomUUID(), city_id, edge_id, kind,
          note: note.trim() || null, status: "unverified",
          created_at: new Date().toISOString(),
        });
        setNote("");
      }}
    >
      <label htmlFor="报-kind" style={{ fontWeight: 600, display: "block" }}>
        Report a problem on this segment
      </label>
      <select id="报-kind" value={kind}
              onChange={(e) => setKind(e.target.value as 报["kind"])}
              style={{ width: "100%", padding: "0.4rem", font: "inherit" }}>
        {類之文.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
      </select>

      <label htmlFor="报-note" style={{ display: "block", marginTop: "0.5rem" }}>
        Details (optional)
      </label>
      <textarea id="报-note" value={note} maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                rows={2} style={{ width: "100%", font: "inherit" }} />

      <button type="submit" style={{ marginTop: "0.5rem" }}>Submit report</button>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
        Reports are anonymous — no account, no location history. Submitted reports
        show as unverified until someone confirms them.
      </p>
    </form>
  );
}
```

`src/frontend/src/components/报事列.tsx`:
```tsx
import type { 报 } from "../data/本地庫";

const 類之文: Record<报["kind"], string> = {
  curb_cut_broken: "Curb cut broken",
  sidewalk_blocked: "Sidewalk blocked",
  no_shade: "No shade",
  closed_facility: "Facility closed",
  other: "Other",
};

export function 报事列({ 报列 }: { 报列: 报[] }) {
  if (报列.length === 0) return null;
  return (
    <section aria-label="Reported problems">
      <h3>Reported problems ({报列.length})</h3>
      <ul>
        {报列.map((r) => (
          <li key={r.id}>
            <strong>{類之文[r.kind]}</strong>
            {r.note ? ` — ${r.note}` : ""}
            {" · "}
            <span style={{ fontWeight: 600 }}>{r.status}</span>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
        Unverified reports come from other pedestrians and have not been checked.
        They raise the cost of a segment in routing; they never make one look safer.
      </p>
    </section>
  );
}
```

- [ ] **Step 6: 接於 `RouteView`**

於 `RouteView` 增 `用报事("la")`,以 `报列` 造 `报之罰`(每一未验之报增 150,confirmed 增 400),傳於 `computeRoute`,並於路線之下陳 `报事列`。若 `供給有無 === false`,則陳:
```tsx
<p role="note">Reports are stored on this device only — no server is configured.</p>
```

- [ ] **Step 7: 全驗而後 commit**

Run:
```bash
python3 -m pytest tests/backend -q && cd src/frontend && npx vitest run && npm run build
```

```bash
git add -A
git commit -m "feat: 立报事之界面,并以其增路段之罚(不减,故不变式不破)"
```

---

## Task 5:ChromaDB 之索引

**Files:**
- Create: `src/backend/pipeline/索引/__init__.py`
- Create: `src/backend/pipeline/索引/建索引.py`
- Test: `tests/backend/test_索引.py`

**Interfaces:**
- `建索引(destinations, 报事, 存於) -> int` — 以 `chromadb.PersistentClient` 建之,回所索之數
- `問(存於, 問之文, n=5) -> list[dict]` — 回最近者

`PersistentClient` 不需 Docker、不需 server,存於盤。此為此環境唯一可行之path。

**索之corpus:** destination 之名與 source,加报事之 note。前此無文可索;报事既立,方有之。

- [ ] **Step 1: 驗 chromadb 已裝**

Run: `python3 -c "import chromadb; print(chromadb.__version__)"`
若未裝:`python3 -m pip install chromadb`。若其裝之不得(此環境或無 Docker 亦無 build tools),則**記其敗於此 task,而以其餘二者(Supabase、SQLite)為足**,不得偽稱已成。

- [ ] **Step 2: 先寫必敗之試**

`tests/backend/test_索引.py`:
```python
import pytest

chromadb = pytest.importorskip("chromadb")

from pipeline.索引.建索引 import 建索引, 問


def _所():
    return [
        {"id": "d1", "name": "Los Angeles Central Library", "kind": "cooling_center",
         "source": "curated: designated cooling centre with air conditioning"},
        {"id": "d2", "name": "Pershing Square", "kind": "rest_stop",
         "source": "curated: public plaza with shade and seating"},
        {"id": "d3", "name": "Union Station", "kind": "transit_stop",
         "source": "GTFS stops.txt"},
    ]


def test_建索引回其數(tmp_path):
    assert 建索引(_所(), [], str(tmp_path)) == 3


def test_报事之文亦入索(tmp_path):
    报 = [{"id": "r1", "edge_id": 42, "kind": "curb_cut_broken",
           "note": "The kerb ramp at 5th and Hill is cracked"}]
    assert 建索引(_所(), 报, str(tmp_path)) == 4


def test_問得相近者(tmp_path):
    建索引(_所(), [], str(tmp_path))
    出 = 問(str(tmp_path), "somewhere with air conditioning", n=2)
    assert len(出) == 2
    assert any("Library" in x["文"] for x in 出)


def test_問空索則回空(tmp_path):
    建索引([], [], str(tmp_path))
    assert 問(str(tmp_path), "anything", n=3) == []


def test_再建則不重(tmp_path):
    建索引(_所(), [], str(tmp_path))
    建索引(_所(), [], str(tmp_path))
    assert len(問(str(tmp_path), "library", n=10)) <= 3
```

- [ ] **Step 3: 運試以驗其敗**

Run: `python3 -m pytest tests/backend/test_索引.py -q`
Expected: FAIL — 無此 module(或 skip,若 chromadb 未裝)

- [ ] **Step 4: 寫其實作**

`src/backend/pipeline/索引/__init__.py`:
```python
"""索引之屬:以 embedding 索destination與报事之文。"""
```

`src/backend/pipeline/索引/建索引.py`:
```python
"""以 ChromaDB 索destination與报事之文,俾以自然之言問之。

PersistentClient runs in-process against a directory on disk: no Docker, no
server, no network. That is the only shape that fits this project's constraints.
"""

_集之名 = "passable_文"


def _得集(存於):
    import chromadb

    客 = chromadb.PersistentClient(path=存於)
    return 客.get_or_create_collection(_集之名)


def 建索引(destinations, 报事, 存於):
    """建之。回所索之數。id 同者則覆之,故再建不重。"""
    集 = _得集(存於)

    ids, 文, 元 = [], [], []
    for d in destinations:
        ids.append(f"dest:{d['id']}")
        文.append(f"{d.get('name', '')}. {d.get('source', '')}")
        元.append({"類": "destination", "kind": d.get("kind", "")})
    for r in 报事:
        if not r.get("note"):
            continue
        ids.append(f"report:{r['id']}")
        文.append(f"{r.get('kind', '')}: {r['note']}")
        元.append({"類": "report", "edge_id": int(r.get("edge_id", -1))})

    if not ids:
        return 0
    # upsert:id 同則覆,故再建不生重
    集.upsert(ids=ids, documents=文, metadatas=元)
    return len(ids)


def 問(存於, 問之文, n=5):
    """以自然之言問之,回最近者。索空則回空。"""
    集 = _得集(存於)
    if 集.count() == 0:
        return []
    出 = 集.query(query_texts=[問之文], n_results=min(n, 集.count()))
    文列 = (出.get("documents") or [[]])[0]
    元列 = (出.get("metadatas") or [[]])[0]
    id列 = (出.get("ids") or [[]])[0]
    return [
        {"id": i, "文": t, "元": m}
        for i, t, m in zip(id列, 文列, 元列)
    ]
```

- [ ] **Step 5: 運試以驗其成**

Run: `python3 -m pytest tests/backend/test_索引.py -q`
Expected: PASS(5 試),或 skip 若 chromadb 未裝。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 以 ChromaDB 索destination與报事之文,可以自然之言问之"
```

---

## 自校(Self-Review)

**各物之職,皆有其實:**
- Supabase:报事之 durable、多人之 store。此為今之 architecture 獨不能為者。✓
- SQLite:报事之 local 鏡。**保**離網可用,非破之 —— 讀恆自 local,寫先 local。✓
- ChromaDB:报事與destination之文,以 embedding 索之。报事既立,方有corpus。✓

**離網之旨不破:** routing 之算全在 client,不涉此三者。Supabase 若不可達,`得供給()` 回 null,而 app 入 local-only 之模 —— 此為第一等之 path,非降級。Task 3 之試明驗之。✓

**不變式不破:** Task 4 之罚為**增**,不為減,故 `cost >= length_m` 猶存。其試明驗之。✓

**無 placeholder:** 每 step 皆有真碼真試。唯 Task 1 Step 3 與 Task 5 Step 1 為**驗**,其果須記,不得偽稱已成。

**未驗者,明記之:**
- Supabase 之 schema 未經 Postgres 之驗(無 Docker,不能 `supabase start`)。俟用戶 `db push` 而後知。
- ChromaDB 之裝,此環境或不能(無 Docker、或無 build tools)。Task 5 Step 1 明記其果。

**型之相合:**
- `报` 之欄於 SQLite 之表(Task 2)、Supabase 之 schema(Task 1)、TS 之 interface(Task 2)三處相合:`id, city_id, edge_id, kind, note, status, created_at`。
- `kind` 五值三處相合;`status` 三值三處相合。
- `edgeCost(edge, flags, hourIdx, tempC, 报之罰?)` 定於 Task 4,其舊之四參之呼皆猶可用(第五為 optional)。✓
