import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CityPack, 區之度 } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { useEnter } from "../motion/useEnter";

/**
 * 指數:區區之通、蔭、連。
 *
 * The ranked list is the primary artifact here, not a map. A choropleth needs
 * WebGL, and WebGL is exactly what this app already learned it cannot assume —
 * so the finding lives in something that renders everywhere, and any map added
 * later is enhancement on top of a view that already works without one.
 */

/** 誤逾其估四分之一者,不足以定次序。與 pipeline 之 _可信之誤比 同。 */
const 可信之誤比 = 0.25;

function 百分(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function 錢(v: number | null): string {
  return v == null ? "—" : `$${v.toLocaleString()}`;
}

/** 區之名。GEOID 之末六位為 tract + blkgrp,較全串可讀。 */
function 區名(geoid: string): string {
  return `Tract ${geoid.slice(5, 11)}, BG ${geoid.slice(11)}`;
}

/*
  其行依序而起。
  五十七行,若各遲六十毫秒則其末待三秒有半 —— 是以動阻其讀。
  故其間止於十二毫秒,且逾二十行者不復遲,直現而已:
  所以識其為一列者,前之數行足矣。
  57 rows at a normal 60ms stagger would make the last one wait 3.4s — motion
  standing between the reader and the data. 12ms, and rows past the twentieth
  do not wait at all: the first few are enough to read the list as a list.
*/
const 錯落之限 = 20;

function IndexRow({ r, i }: { r: 區之度; i: number }) {
  const 減 = useReducedMotion();
  const 誤大 =
    r.入息 != null && r.入息之誤 != null && r.入息之誤 > r.入息 * 可信之誤比;
  const 孤 = r.連之率 != null && r.連之率 < 0.5;
  return (
    /* 其行必自有其地 —— 黏之格取 bg-inherit,無地則其數透其下。 */
    <motion.tr
      initial={減 ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={減 ? { duration: 0 } : { duration: 0.3, delay: Math.min(i, 錯落之限) * 0.012 }}
      className={`border-b border-line transition-colors last:border-0 ${
        孤 ? "bg-error-soft hover:bg-error-soft/75" : "bg-paper hover:bg-panel"
      }`}
    >
      <td className="数 py-2 pr-3 pl-3 text-xs text-muted-foreground">{i + 1}</td>
      <td className="sticky left-0 z-10 bg-inherit py-2 pr-3 text-sm">{區名(r.geoid)}</td>
      <td className="数 py-2 pr-3 text-right text-sm font-semibold">
        <span className="连之格">
          <span>{百分(r.連之率)}</span>
          {/*
            其條但重述其數,非代之 —— 五十七行之次第,數不可一目而得,條可。
            aria-hidden:其義已在其數,重讀則擾。
            The bar restates the number it sits under, never replaces it: the
            ranking is the point of this table and 57 right-aligned percentages
            do not read as a ranking. Hidden from screen readers because the
            value is already announced by the text beside it.
          */}
          {r.連之率 != null && (
            <span
              className="连之条"
              aria-hidden="true"
              style={{ "--率": `${Math.round(r.連之率 * 100)}%` } as React.CSSProperties}
            />
          )}
        </span>
      </td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(r.通之率)}</td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(r.蔭之率)}</td>
      <td className="数 py-2 pr-3 text-right text-sm">
        {錢(r.入息)}
        {r.入息之誤 != null && (
          // 誤必與其估同見。獨見其估,則以未知為已知。
          <span className={`ml-1 text-xs ${誤大 ? "text-notice" : "text-muted-foreground"}`}>
            ±{r.入息之誤.toLocaleString()}
          </span>
        )}
      </td>
    </motion.tr>
  );
}

/**
 * 入息之判。必自其數而出,不可預書於文。
 *
 * MUST be derived. This sentence was hardcoded as "The sign flips and the
 * magnitude collapses", which was measured from Los Angeles and then rendered
 * over every city. Verified across all sixteen packs, it is false in five —
 * Miami (+0.35 -> +0.51), New York (+0.28 -> +0.47), Boston (-0.13 -> -0.34),
 * San Francisco (-0.17 -> -0.27) and Chicago — where the credible subset is
 * STRONGER, not weaker. In St. Louis it rendered "correlates at 0.89 … the sign
 * flips and the magnitude collapses" with zero credible estimates behind it.
 *
 * 此物之旨,正在「所不知者不可以已知之貌出之」。而此一語,
 * 乃以一城之所見,冒十六城之名 —— 是自違其所以立。
 * For a tool whose entire claim is that unknown must never render as known, a
 * conclusion asserted over data that does not support it is the worst possible
 * defect. The three branches below each state only what its own numbers show.
 */
function 入息之判(c: {
  蔭與入息: number | null;
  蔭與入息_可信: number | null;
  可信者: number;
}): string {
  const 全 = c.蔭與入息;
  const 信 = c.蔭與入息_可信;
  if (信 == null || c.可信者 === 0) {
    return "Too few estimates here are precise enough to test the relationship at all — the figure on the left is not a result.";
  }
  if (全 == null) return "";
  if (Math.abs(信) < Math.abs(全)) {
    return "The magnitude collapses on the credible subset, which means the apparent relationship is carried by the least reliable estimates.";
  }
  return "The relationship holds on the credible subset — but one downtown extract cannot establish a citywide pattern, and the sign does not hold still across the other fifteen cities.";
}

export function IndexView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [載之誤, set載之誤] = useState<string | null>(null);
  const 面 = useEnter<HTMLDivElement>({ 位移: 12, 憑: cityId });

  useEffect(() => {
    loadCityPack(cityId).then(setPack).catch((e: Error) => set載之誤(e.message));
  }, [cityId]);

  const 序 = useMemo(() => {
    if (!pack?.index) return [];
    // 連之率最低者居首 —— 此列所問者,「何處之路雖在而不可至」。
    return [...pack.index]
      .filter((r) => r.連之率 != null)
      .sort((a, b) => (a.連之率 ?? 1) - (b.連之率 ?? 1));
  }, [pack]);

  if (載之誤) {
    return (
      <main className="py-6">
        <p role="alert" className="text-error">
          Could not load city data: {載之誤}
        </p>
      </main>
    );
  }
  if (!pack) return <p className="py-6 text-muted-foreground">Loading city data…</p>;

  // 未算者,必明告之。空列與「皆零」不可混。
  if (!pack.index) {
    return (
      <main className="py-6" ref={面}>
        <h1 className="h-lg">Index</h1>
        <p role="note" className="mt-4 rounded-lg border border-line bg-panel p-4 text-sm">
          <span className="font-semibold">Not computed for this city.</span>{" "}
          The block-group index needs Census boundary and income data, and that
          fetch did not succeed when this city pack was built. This is missing
          data, not a score of zero.
          {pack.index_unavailable_reason && (
            <span className="mt-2 block text-xs text-muted-foreground">
              {pack.index_unavailable_reason}
            </span>
          )}
        </p>
      </main>
    );
  }

  const c = pack.index_correlation;
  const 無路者 = pack.index.filter((r) => r.通之率 == null).length;
  const 孤島 = pack.index.filter(
    (r) => r.通之率 === 1 && r.連之率 != null && r.連之率 < 0.05,
  );

  return (
    <main className="py-6" ref={面}>
      <h1 className="h-lg">Index</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Every census block group in the study area, ranked by how much of its
        step-free sidewalk actually connects to the rest of the city.
      </p>

      {孤島.length > 0 && (
        <section
          aria-label="Stranded block groups"
          className="mt-4 rounded-lg border border-error/40 bg-error-soft p-4"
        >
          <h2 className="题-accent h-xs">
            {孤島.length === 1 ? "One block group is" : `${孤島.length} block groups are`}{" "}
            fully step-free and almost entirely cut off
          </h2>
          <p className="mt-1 text-sm">
            {孤島.map((r) => 區名(r.geoid)).join(", ")} —{" "}
            <span className="数">100%</span> of the sidewalk here is wheelchair
            traversable, and{" "}
            <span className="数">{百分(孤島[0].連之率)}</span> of it connects to the
            rest of the step-free network. A citywide “% traversable” figure counts
            these metres as a success.
          </p>
        </section>
      )}

      {/*
        所量之相關,並其不足恃之故。此節乃全view之樞 ——
        This section is the point of the whole view. The project set out to show
        that heat exposure tracks income, measured it, and did not find it. Saying
        so is the same discipline as refusing to publish Phoenix's shade, and the
        numbers below are recomputed on every build rather than written by hand.
      */}
      {c && (
        <section
          aria-label="Income relationship"
          className="mt-4 rounded-lg border border-line p-4"
        >
          <h2 className="题-accent h-xs">
            Does any of this track income? A study area this size cannot answer
            that.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We joined median household income to every block group and looked for
            a relationship. Across all{" "}
            <span className="数">{c.有入息者}</span> block groups with income data,
            shade correlates at{" "}
            <span className="数 font-semibold text-ink">
              {c.蔭與入息 == null ? "—" : c.蔭與入息.toFixed(2)}
            </span>{" "}
            (Spearman). Restricted to the{" "}
            <span className="数">{c.可信者}</span> whose margin of error is within{" "}
            <span className="数">{Math.round(c.誤比之界 * 100)}%</span> of the
            estimate, it is{" "}
            <span className="数 font-semibold text-ink">
              {c.蔭與入息_可信 == null ? "too few to say" : c.蔭與入息_可信.toFixed(2)}
            </span>
            . {入息之判(c)}          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A study area this size cannot answer the question. These are downtown
            extracts of roughly three kilometres, block-group income margins here
            routinely exceed 40% of the estimate, and the income range within a
            single downtown is not the range that exists across a whole city. We
            are reporting the measurement, not the result we expected.
          </p>
        </section>
      )}

      <section aria-label="Block groups" className="mt-6">
        <h2 className="题-accent h-xs">
          Ranked worst-connected first
        </h2>
        {/*
          首行黏於其帶之下,首列黏於其左。
          橫捲則坊之名隨其數而去 —— 三百七十五之屏,「Median income」在其外,
          而其名亦在其外,故所見者六數而無所主。
          縱捲則其首行去於第八行,而 Connected、Step-free、Shaded 皆百分之數,
          既無其首,則不可辨其孰為孰。
          七 rem 者,讓其帶之高(帶黏於頂,見 App 之 chrome)。
          Horizontal scroll took the block-group name off screen with the income
          column, leaving a row of six unlabelled numbers; vertical scroll lost
          the header by row 8, and three of the columns are percentages.
        */}
        {/*
          此表自為一捲之器,其高不過七十之百。
          橫捲者必為捲器,而 overflow-x:auto 之側,overflow-y 雖書 clip 亦計為
          hidden(規所定:一軸為 clip 而他軸非 visible/clip,則 clip 計為 hidden)——
          既為捲器,則 sticky 之 top 附於此器而非其頁,而其器之高即其表之高,
          故縱黏終不發。量之,其首行去而不返。
          今限其高,則此器真為縱捲之主,首行黏於其上,自其第一行至第五十七行不去。
          A horizontally scrollable box cannot also host page-level sticky
          headers: with overflow-x:auto, overflow-y:clip computes to hidden, so
          the box becomes the scrollport and top-28 stuck to a box exactly as
          tall as its content — i.e. never. Bounding the height makes the box the
          real vertical scroller, and the header sticks to it.

          tabIndex 與 role —— 凡可捲者,鍵盤必能至之,不然則但鼠可讀。
          A scrollable region must be keyboard reachable.
        */}
        <div
          role="region"
          aria-label="Block groups ranked by connectivity"
          tabIndex={0}
          className="mt-2 max-h-[70vh] overflow-auto rounded-lg border border-line bg-paper"
        >
          <table className="w-full min-w-[34rem] border-collapse">
            <caption className="sr-only">
              Census block groups ranked by the share of step-free sidewalk
              connected to the citywide network, with shade and median household
              income.
            </caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 pl-3 text-xs font-semibold text-muted-foreground">#</th>
                <th scope="col" className="sticky top-0 left-0 z-20 w-full bg-paper py-2 pr-3 text-xs font-semibold text-muted-foreground">Block group</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Connected</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Step-free</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Shaded 14:00</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Median income</th>
              </tr>
            </thead>
            <tbody>
              {序.map((r, i) => (
                <IndexRow key={r.geoid} r={r} i={i} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-muted-foreground">
        <p>
          Boundaries from the Census Bureau TIGERweb service. Income is
          B19013_001E, median household income, from the{" "}
          <span className="数">2023</span> ACS 5-year summary file, shown with its
          published margin of error. Margins wider than{" "}
          <span className="数">{Math.round(可信之誤比 * 100)}%</span> of the estimate
          are called out beside the figure; an estimate is not a measurement.
          {無路者 > 0 && (
            <>
              {" "}
              <span className="数">{無路者}</span> block group
              {無路者 === 1 ? " has" : "s have"} no mapped sidewalk in this extract
              and are excluded from the ranking rather than scored zero.
            </>
          )}
        </p>
        <p className="mt-2">
          Connectivity is computed for a wheelchair profile against the largest
          step-free component of the sidewalk network. Shade is modelled from
          projected building shadows, not measured. This is a study of published
          data quality as much as of the cities themselves.
        </p>
      </footer>
    </main>
  );
}
