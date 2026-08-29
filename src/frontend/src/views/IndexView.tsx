import { useEffect, useMemo, useState } from "react";
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

function 一行({ r, i }: { r: 區之度; i: number }) {
  const 誤大 =
    r.入息 != null && r.入息之誤 != null && r.入息之誤 > r.入息 * 可信之誤比;
  const 孤 = r.連之率 != null && r.連之率 < 0.5;
  return (
    <tr className={`border-b border-line last:border-0 ${孤 ? "bg-fullsun-soft" : ""}`}>
      <td className="数 py-2 pr-3 text-xs text-muted-foreground">{i + 1}</td>
      <td className="py-2 pr-3 text-sm">{區名(r.geoid)}</td>
      <td className="数 py-2 pr-3 text-right text-sm font-semibold">
        {百分(r.連之率)}
      </td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(r.通之率)}</td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(r.蔭之率)}</td>
      <td className="数 py-2 text-right text-sm">
        {錢(r.入息)}
        {r.入息之誤 != null && (
          // 誤必與其估同見。獨見其估,則以未知為已知。
          <span className={`ml-1 text-xs ${誤大 ? "text-midsun" : "text-muted-foreground"}`}>
            ±{r.入息之誤.toLocaleString()}
          </span>
        )}
      </td>
    </tr>
  );
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
      <main className="py-8">
        <p role="alert" className="text-fullsun">
          Could not load city data: {載之誤}
        </p>
      </main>
    );
  }
  if (!pack) return <p className="py-8 text-muted-foreground">Loading city data…</p>;

  // 未算者,必明告之。空列與「皆零」不可混。
  if (!pack.index) {
    return (
      <main className="py-6" ref={面}>
        <h1 className="text-2xl font-semibold tracking-tight">Index</h1>
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
      <h1 className="text-2xl font-semibold tracking-tight">Index</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Every census block group in the study area, ranked by how much of its
        step-free sidewalk actually connects to the rest of the city.
      </p>

      {孤島.length > 0 && (
        <section
          aria-label="Stranded block groups"
          className="mt-4 rounded-lg border border-fullsun/40 bg-fullsun-soft p-4"
        >
          <h2 className="text-base font-semibold">
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
          <h2 className="text-base font-semibold">
            Does any of this track income? Not measurably, at this scale.
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
            . The sign flips and the magnitude collapses, which means the apparent
            relationship is carried by the least reliable estimates.
          </p>
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
        <h2 className="题-accent text-lg font-semibold">
          Ranked worst-connected first
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse">
            <caption className="sr-only">
              Census block groups ranked by the share of step-free sidewalk
              connected to the citywide network, with shade and median household
              income.
            </caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-2 pr-3 text-xs font-semibold text-muted-foreground">#</th>
                <th scope="col" className="py-2 pr-3 text-xs font-semibold text-muted-foreground">Block group</th>
                <th scope="col" className="py-2 pr-3 text-right text-xs font-semibold text-muted-foreground">Connected</th>
                <th scope="col" className="py-2 pr-3 text-right text-xs font-semibold text-muted-foreground">Step-free</th>
                <th scope="col" className="py-2 pr-3 text-right text-xs font-semibold text-muted-foreground">Shaded 14:00</th>
                <th scope="col" className="py-2 text-right text-xs font-semibold text-muted-foreground">Median income</th>
              </tr>
            </thead>
            <tbody>
              {序.map((r, i) => (
                <一行 key={r.geoid} r={r} i={i} />
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
          are marked in amber; an estimate is not a measurement.
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
