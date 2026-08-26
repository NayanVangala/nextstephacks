import type { SupabaseClient } from "@supabase/supabase-js";
import type { 庫, 报 } from "./本地庫";

const 表 = "报事";

/** 送於 remote 者。status 不與焉 —— 其值由 RLS 定為 unverified。 */
function 可送之形(r: 报) {
  return {
    id: r.id,
    city_id: r.city_id,
    edge_id: r.edge_id,
    kind: r.kind,
    note: r.note,
    created_at: r.created_at,
  };
}

/**
 * 寫一报。
 *
 * ORDER MATTERS: local first, remote second. Writing remote first would lose
 * the report entirely when the network is down — which is precisely when
 * someone is standing at a blocked sidewalk wanting to report it.
 */
export async function 寫报(
  db: 庫,
  r: 报,
  供: SupabaseClient | null,
): Promise<void> {
  await db.增报(r);
  if (!供) return;
  try {
    const { error } = await 供.from(表).insert(可送之形(r));
    if (!error) await db.標已同步([r.id]);
  } catch {
    // 網斷、CORS、任何之敗 —— 报犹在 local 而待同步
  }
}

/** 讀报。恆自 local,故網斷無妨。 */
export async function 讀报(db: 庫, city_id: string, edge_id?: number) {
  return db.取报(city_id, edge_id);
}

/** 推待同步者,拉 remote 之新者。一者之敗不害其餘。 */
export async function 同步(
  db: 庫,
  city_id: string,
  供: SupabaseClient | null,
): Promise<{ 推: number; 拉: number }> {
  if (!供) return { 推: 0, 拉: 0 };

  let 推 = 0;
  for (const r of await db.待同步之报()) {
    try {
      const { error } = await 供.from(表).insert(可送之形(r));
      if (!error) {
        await db.標已同步([r.id]);
        推 += 1;
      }
    } catch {
      // 留待下次
    }
  }

  let 拉 = 0;
  try {
    const { data, error } = await 供
      .from(表)
      .select("id,city_id,edge_id,kind,note,status,created_at")
      .eq("city_id", city_id)
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      for (const r of data as 报[]) {
        await db.增报(r, { 自remote: true });
        拉 += 1;
      }
    }
  } catch {
    // 拉之不得,local 猶足用
  }

  return { 推, 拉 };
}
