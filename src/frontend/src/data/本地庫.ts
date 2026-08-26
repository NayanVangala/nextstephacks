import initSqlJs, { type Database } from "sql.js";

export interface 报 {
  id: string;
  city_id: string;
  edge_id: number;
  kind:
    | "curb_cut_broken"
    | "sidewalk_blocked"
    | "no_shade"
    | "closed_facility"
    | "other";
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
 * This is what keeps "works offline" true once reports exist: reads never touch
 * the network, and writes queue locally until it returns. The WASM binary is
 * served from our own origin (public/sql-wasm/), never a CDN — a CDN dependency
 * would silently break the offline guarantee the product claims.
 */
export async function 開庫(
  opts: { 記憶中?: boolean; wasm之路?: string } = {},
): Promise<庫> {
  const 路 = opts.wasm之路 ?? `${import.meta.env.BASE_URL ?? "/"}sql-wasm/`;
  const SQL = await initSqlJs({ locateFile: (f: string) => `${路}${f}` });

  let db: Database;
  const 舊 = opts.記憶中 ? null : safeGet(存之鑰);
  if (舊) {
    const 位元 = Uint8Array.from(atob(舊), (c) => c.charCodeAt(0));
    db = new SQL.Database(位元);
  } else {
    db = new SQL.Database();
  }
  db.run(建表之語);

  const 存 = () => {
    if (opts.記憶中) return;
    try {
      const 位元 = db.export();
      let s = "";
      for (const b of 位元) s += String.fromCharCode(b);
      localStorage.setItem(存之鑰, btoa(s));
    } catch {
      // 存之不得(額滿、私密之窗)則但失其久存,本回之报犹在記憶中
    }
  };

  const 列為报 = (row: unknown[]): 报 => ({
    id: row[0] as string,
    city_id: row[1] as string,
    edge_id: row[2] as number,
    kind: row[3] as 报["kind"],
    note: (row[4] ?? null) as string | null,
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

  const 欄 = "id,city_id,edge_id,kind,note,status,created_at";

  return {
    async 增报(r, o = {}) {
      db.run(
        `insert or ignore into 报事
         (${欄}, 待同步) values (?,?,?,?,?,?,?,?)`,
        [r.id, r.city_id, r.edge_id, r.kind, r.note, r.status, r.created_at,
         o.自remote ? 0 : 1] as never,
      );
      存();
    },
    async 取报(city_id, edge_id) {
      return edge_id === undefined
        ? 查(`select ${欄} from 报事 where city_id = ? order by created_at desc`,
             [city_id])
        : 查(`select ${欄} from 报事 where city_id = ? and edge_id = ?
              order by created_at desc`, [city_id, edge_id]);
    },
    async 待同步之报() {
      return 查(`select ${欄} from 报事 where 待同步 = 1 order by created_at asc`, []);
    },
    async 標已同步(ids) {
      if (ids.length === 0) return;
      const 問 = ids.map(() => "?").join(",");
      db.run(`update 报事 set 待同步 = 0 where id in (${問})`, ids as never);
      存();
    },
  };
}

function safeGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null; // node、私密之窗,皆歸於此
  }
}
