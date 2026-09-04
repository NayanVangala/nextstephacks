import { useEffect, useState } from "react";

/**
 * 題之擇。其常為暗,擇淡則存之。
 *
 * WHY THIS EXISTS RATHER THAN A MEDIA QUERY: CSS has no "no preference" value
 * for prefers-color-scheme — any client not set to dark reports light. So "dark
 * by default, light for anyone who needs it" is not expressible as a query,
 * because a light OS preference and no preference at all look identical.
 *
 * 故其擇出於其人之手,不出於其機之報。暗為其本,而淡者按之乃得,且其擇存焉。
 * Dark is the base for everyone; light is an explicit, persisted choice.
 *
 * 淡不可去 —— 好淡者自有其疾(散光、閱讀之障)。此物為便不能者而設,
 * 奪其所須則自違其旨。
 * Light must remain reachable: readers with astigmatism or certain reading
 * disabilities need it, and an accessibility tool that removes it contradicts
 * its own purpose.
 */

/*
  其鑰。index.html 於畫前亦讀此,二處不可異其名。

  ── 何以易其鑰 ──────────────────────────────────────────────────────
  舊鑰(passable:theme)不可復用。前之世界以暗為常,而此效於初掛即書其值 ——
  故凡曾至此頁者,其機皆存一「dark」,而其人未嘗擇之。今紙為其常,若仍讀舊鑰,
  則此數人永不得見其新世界:其所見者,乃一無人所擇之舊擇。

  舊值與真擇不可辨(其形同為 "dark"),故不可以其值決之;惟易其鑰,
  則舊之自動所書者自廢,而新世界得達於眾。凡於新世界中自擇者,書於新鑰。
  MUST be a new key. The previous world defaulted to dark and this effect wrote
  its value on mount, so everyone who ever loaded the old site has "dark"
  persisted without having chosen it. With paper as the default, reading the old
  key would leave every returning visitor looking at a preference nobody set.
  An auto-written "dark" is indistinguishable from a deliberate one, so the
  value cannot be used to tell them apart — versioning the key retires the
  automatic ones and lets the new default reach people.
*/
const 題之鑰 = "passable:theme:v2";

type 題 = "dark" | "light";

function 讀其擇(): 題 {
  try {
    return localStorage.getItem(題之鑰) === "dark" ? "dark" : "light";
  } catch {
    // 私密之窗或禁其存者,從其常 —— 其常為晝印。
    return "light";
  }
}

export function ThemeToggle() {
  const [題, set題] = useState<題>(讀其擇);

  useEffect(() => {
    /*
      晝印為其本,故晝不書其屬 —— 屬之有無即其別。
      riso 之世界立於紙,故其常必為紙;夜印猶在,一擊可得,為好淡者、
      為散光者、為讀之有障者而存 —— 所易者惟其主客。
      Paper is the base now, so the day pull writes no attribute. The night pull
      is one click away and stays for readers who need it.
    */
    if (題 === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(題之鑰, 題);
    } catch {
      // 不能存者,其擇止於此頁 —— 猶勝於不能擇。
    }
  }, [題]);

  const 次 = 題 === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => set題(次)}
      /*
        其名必全 —— 圖而無名,讀屏但聞「button」。
        aria-pressed 不用:此非二態之一鈕,乃易其題者,故以其名言其所將為。
      */
      aria-label={`Switch to ${次} theme`}
      title={`Switch to ${次} theme`}
      className="切纸 flex size-11 items-center justify-center border border-line text-ink/70 transition-colors hover:border-ink hover:text-ink"
    >
      <span aria-hidden className="text-sm leading-none">
        {題 === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
