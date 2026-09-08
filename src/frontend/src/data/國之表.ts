import type { 國之表 } from "../types";

/**
 * 取國之表。
 *
 * 一取而記之 —— 其文數兆,而諸器共之。囊之記止於二(見 loadCityPack),
 * 此則無此慮:一文而已,不隨城而易。
 * Cached indefinitely: unlike a city pack this is one small file that does not
 * vary by city, so there is no memory ceiling to respect.
 */
let 記: Promise<國之表> | null = null;

export function load國之表(
  fetchFn: (u: string) => Promise<Response> = (u) => fetch(u),
  用記 = true,
): Promise<國之表> {
  if (用記 && 記) return 記;
  const 基 = import.meta.env.BASE_URL ?? "/";
  const p = fetchFn(`${基}national.json`)
    .then(async (res) => {
      // 四百之身為 HTML。直付 json() 則其誤言其文法,而其實為無此文。
      if (!res.ok) throw new Error(`national table: HTTP ${res.status}`);
      const d = (await res.json()) as 國之表;
      // 空表與未取不可混 —— 空者當即敗,不當默然為一空之列。
      if (!d?.cities?.length) throw new Error("national table is empty");
      return d;
    })
    .catch((e) => {
      if (用記) 記 = null; // 敗則忘之,俾可再試
      throw e;
    });
  if (用記) 記 = p;
  return p;
}
