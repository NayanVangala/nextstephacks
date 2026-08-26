import { useCallback, useEffect, useMemo, useState } from "react";
import { 開庫, type 庫, type 报 } from "../data/本地庫";
import { 得供給 } from "../data/供給";
import { 寫报, 讀报, 同步 } from "../data/报事";

const 供 = 得供給();

// 未验之报,增之以罚;已验者罚倍之。增而不减,故不变式不破。
const 罰之值: Record<报["status"], number> = {
  unverified: 150,
  confirmed: 400,
  disputed: 0,
};

export function useReports(city_id: string) {
  const [db, setDb] = useState<庫 | null>(null);
  const [报列, set报列] = useState<报[]>([]);
  const [同步中, set同步中] = useState(false);
  const [庫之誤, set庫之誤] = useState<string | null>(null);

  useEffect(() => {
    let 已棄 = false;
    開庫()
      .then(async (d) => {
        if (已棄) return;
        setDb(d);
        set报列(await 讀报(d, city_id));
        if (供) {
          set同步中(true);
          await 同步(d, city_id, 供);
          if (!已棄) set报列(await 讀报(d, city_id));
          set同步中(false);
        }
      })
      .catch((e: Error) => set庫之誤(e.message));
    return () => { 已棄 = true; };
  }, [city_id]);

  // 回其成敗。庫未開而詭稱已存,乃此物所深惡者 —— 界面不得言其所未行。
  const 寫 = useCallback(
    async (r: 报): Promise<boolean> => {
      if (!db) return false;
      try {
        await 寫报(db, r, 供);
        set报列(await 讀报(db, city_id));
        return true;
      } catch (e) {
        set庫之誤((e as Error).message);
        return false;
      }
    },
    [db, city_id],
  );

  // 段之罚。同段数报则累之 —— 报愈多,愈当避之。
  const 罰 = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of 报列) {
      m.set(r.edge_id, (m.get(r.edge_id) ?? 0) + 罰之值[r.status]);
    }
    return m;
  }, [报列]);

  return { 报列, 罰, 寫, 同步中, 庫之誤, 就緒: db !== null, 供給有無: 供 !== null };
}
