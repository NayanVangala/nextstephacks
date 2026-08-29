import { useCallback, useEffect, useMemo, useState } from "react";
import { 開庫, type 庫, type 报 } from "../data/本地庫";
import { 得供給 } from "../data/供給";
import { 寫报, 讀报, 同步 } from "../data/报事";
import { useAuth } from "../auth/useAuth";
import { 罰之表, 段之狀 as 算段之狀 } from "../data/报之重";

const 供 = 得供給();

export function useReports(city_id: string) {
  const [db, setDb] = useState<庫 | null>(null);
  const [报列, set报列] = useState<报[]>([]);
  const [同步中, set同步中] = useState(false);
  const [庫之誤, set庫之誤] = useState<string | null>(null);
  const { 狀: 登入之狀 } = useAuth();
  const 己身 = 登入之狀.態 === "已登入" ? 登入之狀.session.user.id : null;

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
        await 寫报(db, r, 供, 己身);
        set报列(await 讀报(db, city_id));
        return true;
      } catch (e) {
        set庫之誤((e as Error).message);
        return false;
      }
    },
    [db, city_id, 己身],
  );

  // 段之罚。眾則益之,久則衰之,爭則損之 —— 其法在 报之重.ts。
  // 前此但累其数而不问其时其争,故去岁之报与今日者同重。
  const 罰 = useMemo(() => 罰之表(报列), [报列]);

  /** 一段之狀。示於行程之每步,俾人自斷其可信。 */
  const 段狀 = useMemo(() => {
    const 聚 = new Map<number, typeof 报列>();
    for (const r of 报列) {
      const 有 = 聚.get(r.edge_id);
      if (有) 有.push(r);
      else 聚.set(r.edge_id, [r]);
    }
    const m = new Map<number, ReturnType<typeof 算段之狀>>();
    for (const [id, 列] of 聚) m.set(id, 算段之狀(列));
    return m;
  }, [报列]);

  /**
   * 確認或存疑一段之报。
   *
   * A confirmation is a NEW row, never an edit of the existing one. The reports
   * table has no UPDATE policy on purpose: if a confirmed report could have its
   * text changed afterwards, the confirmation would vouch for something nobody
   * read. Filing a fresh row keeps every judgement attributable to whoever made
   * it and to when.
   */
  const 表態 = useCallback(
    async (edge_id: number, 態: "confirmed" | "disputed", kind: 报["kind"]): Promise<boolean> => {
      if (!db) return false;
      try {
        await 寫报(db, {
          id: crypto.randomUUID(),
          city_id, edge_id, kind, note: null,
          status: 態,
          created_at: new Date().toISOString(),
        }, 供, 己身);
        set报列(await 讀报(db, city_id));
        return true;
      } catch (e) {
        set庫之誤((e as Error).message);
        return false;
      }
    },
    [db, city_id, 己身],
  );

  return {
    报列, 罰, 段狀, 寫, 表態, 同步中, 庫之誤,
    就緒: db !== null, 供給有無: 供 !== null,
  };
}
