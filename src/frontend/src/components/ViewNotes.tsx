/**
 * 一器之註與其限。
 *
 * 四器之末皆有其文 —— 影之所以算、籤之所以闕、其數之所以不可盡信。
 * 其文皆實,而其長奪人之目:讀者所欲者一路,而先遇三百字之法。
 * 故摺之。
 *
 * ── 所摺者何,所不摺者何 ──────────────────────────────────────────────
 *
 * 摺者,法也 —— 影何以算,籤自何來,其數之所本。此非一時之事,人一讀而足。
 *
 * 不摺者,二:
 *   一、繫於一數之疑。PRODUCT.md 之首則曰「其疑當與其數並行」——
 *      「並行」者,不可隔一擊也。故「未驗之段幾何」「此影多為所推」之屬,
 *      仍在其數之側。
 *   二、當下之警。熱之警不得而問者、無路者、庫之不可用者 —— 皆隨時而變,
 *      而人所以決其行者也。摺之則有人以為無警,而其實未問。
 *
 * DELIBERATELY NOT COLLAPSED: per-figure uncertainty (principle 1 says the
 * uncertainty ships *beside* the number, and one click away is not beside) and
 * anything live — heat-alert failures, no-route explanations, storage errors.
 * A collapsed "alerts could not be checked" would read as "no alerts", which is
 * the exact failure this product exists to refuse.
 *
 * details 為其本 —— 鍵可及、讀屏自宣其開闔、無 JS、無狀。
 * Native <details>: keyboard-operable, its expanded state announced by screen
 * readers, and no state to get wrong.
 */
export function ViewNotes({
  題 = "How this was computed, and what it can't tell you",
  children,
}: {
  題?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="註之摺 mt-10 border-t border-line">
      {/*
        四十四像素之底 —— 手之不準者,其的不可小於此。
        list-none 者,去其三角,而自畫一記 —— 其三角於各瀏覽器不一,
        且其色不從此站之墨。
      */}
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 pt-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <span aria-hidden className="註之記 inline-block w-3 shrink-0 text-center">
          +
        </span>
        {題}
      </summary>
      <div className="pt-3 pb-4 text-xs text-muted-foreground [&>p+p]:mt-2">
        {children}
      </div>
    </details>
  );
}
