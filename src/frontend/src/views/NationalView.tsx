import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { 國之城, 國之表 } from "../types";
import { load國之表 } from "../data/國之表";
import { ViewNotes } from "../components/ViewNotes";
import { useEnter } from "../motion/useEnter";

/**
 * 國之表:三十八城,同一尺而相較。
 *
 * 前此每數皆一城之數。README 舉三十八城,而器但示其一 —— 「五十八成之樓
 * 無其高」云者,離線算之而書於文,非其器所能自陳。此表使其可陳,且可駁。
 *
 * ── 此表之險,即此器之所以立 ─────────────────────────────────────────
 *
 * 徑以斷之率次其城,則拉斯維加斯、綠灣、奧蘭多居其末 ——
 * 「百之百可通,無所斷」—— 而讀者以為其善。其實其明籤之米近於零:
 * 無一段標為不可過,則無一段見為不可過。
 *
 * 量之:籤之比與斷之率,其秩相關零點五六(n=38)。
 * 是此表所量者,城之測幾何,不下於城之通幾何。
 *
 * THE RANKING IS DANGEROUS AND THAT IS WHY THE VIEW LEADS WITH ITS OWN
 * LIMITATION. Sorted by severance alone, the least-surveyed cities land at the
 * bottom looking like the most accessible ones. Measured Spearman correlation
 * between tagged share and severance is +0.56 across all 38 — so this table
 * measures survey effort at least as much as accessibility, and it says so
 * above the table rather than in a footnote under it.
 */

const 身之目 = [
  { id: "wheelchair", label: "Wheelchair" },
  { id: "blind_low_vision", label: "Blind / low vision" },
  { id: "heat_sensitive", label: "Heat-sensitive" },
] as const;
type 身之名 = (typeof 身之目)[number]["id"];

const 次之目 = [
  { id: "severed", label: "Most severed" },
  { id: "traversable", label: "Least traversable" },
  { id: "shade", label: "Least shade" },
  { id: "tagged", label: "Least surveyed" },
] as const;
type 次之名 = (typeof 次之目)[number]["id"];

function 百分(v: number | null | undefined): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

/* 錯落之限,與 IndexView 同 —— 三十八行,其動不可阻其讀。 */
const 錯落之限 = 20;

function 取其值(c: 國之城, 身: 身之名, 次: 次之名): number {
  const p = c.profiles[身];
  if (次 === "severed") return p.severed_rate;
  if (次 === "traversable") return 1 - p.traversable_rate;
  if (次 === "shade") return 1 - p.shade_rate;
  return 1 - c.tagged_rate;
}

function NationalRow({
  c, i, 身, onPick,
}: { c: 國之城; i: number; 身: 身之名; onPick: (id: string) => void }) {
  const 減 = useReducedMotion();
  const p = c.profiles[身];
  // 籤寡者,其數不足以定次序。其標與 IndexView 之孤者同:墨之淡地與失準,
  // 不出三墨之外 —— 資之極不可以第四色編之。
  const 寡 = !c.well_surveyed;
  return (
    <motion.tr
      initial={減 ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={減 ? { duration: 0 } : { duration: 0.3, delay: Math.min(i, 錯落之限) * 0.012 }}
      className={`border-b border-line transition-colors last:border-0 ${
        寡 ? "bg-ink/[0.09] hover:bg-ink/[0.14]" : "bg-paper hover:bg-panel"
      }`}
    >
      <td className="数 py-2 pr-3 pl-3 text-xs text-muted-foreground">{i + 1}</td>
      <td className="sticky left-0 z-10 bg-inherit py-2 pr-3 text-sm">
        {/*
          城之名即其鏈 —— 讀者見一城之異,所欲者即入其城而視之。
          按之則易其城而入其審,不待其復尋於上之選。
        */}
        <button
          type="button"
          onClick={() => onPick(c.id)}
          className={`min-h-11 text-left transition-colors hover:text-accent-ink ${寡 ? "失準" : ""}`}
        >
          {c.name}
        </button>
      </td>
      <td className="数 py-2 pr-3 text-right text-sm font-semibold">
        <span className="连之格">
          <span>{百分(p.severed_rate)}</span>
          {/* 其條但重述其數 —— 三十八行之次第,數不可一目而得,條可。 */}
          <span
            className="连之条"
            aria-hidden="true"
            style={{ "--率": `${Math.min(100, p.severed_rate * 1000)}%` } as React.CSSProperties}
          />
        </span>
      </td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(p.traversable_rate)}</td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(p.shade_rate)}</td>
      <td className="数 py-2 pr-3 text-right text-sm">
        {百分(c.tagged_rate)}
        {寡 && (
          <span className="ml-1 text-xs text-muted-foreground">
            {/* 其寡必與其數同見。獨見其率,則讀者以其次序為實。 */}
            too thin to rank
          </span>
        )}
      </td>
      <td className="数 py-2 pr-3 text-right text-sm">{百分(c.assumed_height_rate)}</td>
      <td className="数 py-2 pr-3 pr-3 text-right text-sm text-muted-foreground">
        {c.segments.toLocaleString()}
      </td>
    </motion.tr>
  );
}

export function NationalView({ onPickCity }: { onPickCity: (id: string) => void }) {
  const [表, set表] = useState<國之表 | null>(null);
  const [載之誤, set載之誤] = useState<string | null>(null);
  const [身, set身] = useState<身之名>("wheelchair");
  const [次, set次] = useState<次之名>("severed");
  const 面 = useEnter<HTMLDivElement>({ 位移: 12, 憑: `${身}|${次}` });

  useEffect(() => {
    load國之表().then(set表).catch((e: Error) => set載之誤(e.message));
  }, []);

  const 序 = useMemo(() => {
    if (!表) return [];
    /*
      籤寡者恆居其末,不與其次序爭。
      非棄之也 —— 其行猶在,其數猶見,而其位不使人以為其善。
      徑次之,則未測者居首(或居末,從其次)而讀者以為其實。
      Under-surveyed cities are pinned below the ranked ones rather than
      dropped: their rows and figures stay visible, but they cannot occupy a
      rank that would read as a finding about the city.
    */
    return [...表.cities].sort((a, b) => {
      if (a.well_surveyed !== b.well_surveyed) return a.well_surveyed ? -1 : 1;
      return 取其值(b, 身, 次) - 取其值(a, 身, 次);
    });
  }, [表, 身, 次]);

  if (載之誤) {
    return (
      <main className="py-6">
        <p role="alert" className="text-error">
          Could not load the national table: {載之誤}
        </p>
      </main>
    );
  }
  if (!表) return <p className="py-6 text-muted-foreground">Loading the national table…</p>;

  const ρ = 表.survey_correlation.tagged_vs_severed;

  return (
    <main className="py-6">
      <h1 className="h-lg">All {表.cities.length} downtowns</h1>
      {/*
        束其幅 —— 器首之版濃於其右,而此句長,至一二八〇則其末入其濃處而無地。
        Bounded so it wraps before the masthead plate's dense half; measured
        intruding at 1280 with no background behind it.
      */}
      <p className="mt-0.5 max-w-[54ch] text-sm text-muted-foreground">
        The same measurements across every city in the tool, so they can be
        compared rather than read one at a time.
      </p>

      {/*
        此表之限,置於其表之上,不置於其下。
        讀者次其城而後乃見其限者,已據其次序而斷矣。
        The limitation leads. A reader who meets it below the table has already
        drawn a conclusion from the ranking.
      */}
      <p role="note" className="mt-4 border-l-2 border-notice bg-notice-soft px-4 py-3 text-sm">
        <span className="font-semibold">
          This ranks survey coverage as much as accessibility.
        </span>{" "}
        A city with nothing tagged as impassable shows nothing impassable. Across
        all <span className="数">{表.survey_correlation.n}</span> downtowns, the
        share of network explicitly tagged and the share measured as severed
        correlate at{" "}
        <span className="数 font-semibold">{ρ == null ? "—" : ρ.toFixed(2)}</span>{" "}
        (Spearman) — the better surveyed a city is, the worse it scores.{" "}
        <span className="数">{表.survey_correlation.below_threshold}</span> of
        them have under{" "}
        <span className="数">{Math.round(表.tagged_threshold * 100)}%</span> of
        their network explicitly tagged; those are listed below the ranked cities
        rather than within them, because their figures cannot support a rank.
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <span id="國-身" className="mb-1 block text-xs font-semibold">
            Profile
          </span>
          <div role="group" aria-labelledby="國-身" className="flex flex-wrap gap-1.5">
            {身之目.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={身 === x.id}
                onClick={() => set身(x.id)}
                className={`min-h-11 切纸 border px-3.5 text-xs transition-colors ${
                  身 === x.id
                    ? "border-accent-ink bg-accent-wash font-semibold text-accent-ink"
                    : "border-line bg-paper text-muted-foreground hover:border-accent-ink/40"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span id="國-次" className="mb-1 block text-xs font-semibold">
            Rank by
          </span>
          <div role="group" aria-labelledby="國-次" className="flex flex-wrap gap-1.5">
            {次之目.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={次 === x.id}
                onClick={() => set次(x.id)}
                className={`min-h-11 切纸 border px-3.5 text-xs transition-colors ${
                  次 === x.id
                    ? "border-accent-ink bg-accent-wash font-semibold text-accent-ink"
                    /* 此列之鈕正坐於版之濃處(量之:Least shade、Least surveyed
                       皆裸而入之),故未選者亦立一紙之地。 */
                    : "border-line bg-paper text-muted-foreground hover:border-accent-ink/40"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section aria-label="All downtowns" ref={面} className="mt-6">
        {/* 表逾其幅則自捲於其內 —— 頁之身不可橫捲。 */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse">
            <caption className="sr-only">
              Every downtown in the tool, ranked for the {身之目.find((x) => x.id === 身)?.label}{" "}
              profile. Cities with under {Math.round(表.tagged_threshold * 100)}% of
              their network explicitly tagged are listed last.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 pl-3 text-xs font-semibold text-muted-foreground">#</th>
                <th scope="col" className="sticky top-0 left-0 z-20 bg-paper py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">City</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Severed</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Traversable</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Shaded 14:00</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Tagged</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">No height</th>
                <th scope="col" className="sticky top-0 z-10 bg-paper py-2 pr-3 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground">Segments</th>
              </tr>
            </thead>
            <tbody>
              {序.map((c, i) => (
                <NationalRow key={c.id} c={c} i={i} 身={身} onPick={onPickCity} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ViewNotes>
        <p>
          Every figure here is recomputed from the same shipped city packs the
          rest of the tool routes on, by the same definitions the City audit
          uses — traversable share by metres rather than segment count, shade
          measured at{" "}
          <span className="数">
            {String(表.hour_bucket_index * 2 + 6).padStart(2, "0")}:00
          </span>{" "}
          against a {表.shade_threshold} exposure threshold, and severance as the
          share of connected sidewalk nodes that drop out of the largest
          step-free component for this profile.
        </p>
        <p>
          “Tagged” is the share of network length carrying an explicit
          wheelchair, kerb, or steps tag in OpenStreetMap. “No height” is the
          share of building footprints with no published height, which is what
          the shade model has to assume its way around. Both are measurements of
          the published record, not of the city.
        </p>
        <p>
          Coverage is downtown cores, not whole metros, and the extracts differ
          in size — a bounding box is not a city. Computed from packs built{" "}
          {new Date(表.generated_at).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })}
          {/*
            其日從其囊,不從其算 —— 此表之新不逾其囊之新,故所書者囊之日。
            The date is the newest pack's, not the run's: this table cannot be
            fresher than the data under it, so it reports that instead.
          */}
          , which is as current as this table can be.
        </p>
      </ViewNotes>
    </main>
  );
}
