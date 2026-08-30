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

/** 其鑰。index.html 於畫前亦讀此,二處不可異其名。 */
const 題之鑰 = "passable:theme";

type 題 = "dark" | "light";

function 讀其擇(): 題 {
  try {
    return localStorage.getItem(題之鑰) === "light" ? "light" : "dark";
  } catch {
    // 私密之窗或禁其存者,從其常。
    return "dark";
  }
}

export function ThemeToggle() {
  const [題, set題] = useState<題>(讀其擇);

  useEffect(() => {
    // 暗為其本,故暗不書其屬 —— 屬之有無即其別。
    if (題 === "light") document.documentElement.dataset.theme = "light";
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
      className="flex size-9 items-center justify-center rounded-md border border-white/20 text-white/70 transition-colors hover:border-white/40 hover:text-white"
    >
      <span aria-hidden className="text-sm leading-none">
        {題 === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
