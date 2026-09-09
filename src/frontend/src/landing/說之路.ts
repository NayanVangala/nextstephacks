/**
 * 說之頁之路。其解與其名在此,其身在 InfoPage。
 *
 * ── 何以別為一檔 ─────────────────────────────────────────────────────
 *
 * App 須知其路(解其 hash 而定所render者),而不須其身。
 * 二者同居一檔,則 App 之一引即載其全 —— 五十五兆之文,而其人未必一讀。
 * 故其解出之,而其身可惰載。
 *
 * App must parse the hash to know WHICH page to render, but does not need the
 * pages themselves. While both lived in InfoPage.tsx, App's import of the
 * parser pulled in all 55 kB of prose, so the component could not be split out
 * however it was imported.
 *
 * 且 InfoPage 前此兼出其器與其函,故 react(only-export-components) 訾之
 * (Fast Refresh 不識之)。此分並去其訾。
 * Also silences react(only-export-components): a file exporting both a
 * component and plain functions defeats Fast Refresh.
 */

/** 說之四頁。此四在 nav,亦在「Keep reading」之列。 */
export const 說之要 = ["help", "questions", "about", "limits"] as const;

/**
 * 法之二頁。可指,而不入 nav。
 *
 * Nav.tsx 已言五鏈於七六八之屏不可容(量之,逾其地);今若六則益甚。
 * 且法之頁非讀者所尋,乃所查者 —— 其位在footer,不在其首。
 * Deliberately routable but not in the nav: Nav.tsx already records that five
 * links overflow at 768px, and six would be worse. Legal pages are looked up,
 * not browsed, so the footer is the right place for them.
 */
export const 說之法 = ["privacy", "terms"] as const;

export const 說之頁 = [...說之要, ...說之法] as const;
export type 說之頁 = (typeof 說之頁)[number];

/** 自 hash 得其頁。非說之頁者回 null —— 未知之路一律歸於 landing。 */
export function 解說之頁(hash: string = location.hash): 說之頁 | null {
  const m = /^#\/(help|questions|about|limits|privacy|terms)\b/.exec(hash);
  return m ? (m[1] as 說之頁) : null;
}
