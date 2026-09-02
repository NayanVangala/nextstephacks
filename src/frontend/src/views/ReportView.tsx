import { useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { 可通之率, 蔭之率, 無階可至者, 信之分佈, 斷之率 } from "../report/度量";
import { 熱陷 } from "../report/熱陷";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { MetricCard } from "../components/MetricCard";
import { useEnter } from "../motion/useEnter";
import { 停運之狀 } from "../data/停運";
import { 成址 } from "../data/路之址";
import { Reveal } from "../motion/reveal";

const 午後 = 4; // hour_buckets[4] === 14:00

const 輪椅之身: ProfileFlags = {
  wheelchair: true,
  blind_low_vision: false,
  heat_sensitive: false,
};

const 百分 = (x: number) => `${(x * 100).toFixed(1)}%`;
const 公里 = (m: number) => `${(m / 1000).toFixed(1)} km`;

export function ReportView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>(輪椅之身);
  const [hourIdx, setHourIdx] = useState(午後);
  // 四數依序而起。身既易則數亦易,故憑其身重動之。
  const 卡 = useEnter<HTMLElement>({
    選: "[data-slot=card]",
    位移: 16,
    間: 0.07,
    憑: `${cityId}|${flags.wheelchair}|${flags.blind_low_vision}|${flags.heat_sensitive}`,
  });

  useEffect(() => {
    loadCityPack(cityId).then(setPack);
  }, [cityId]);

  const 報 = useMemo(() => {
    if (!pack) return null;
    return {
      通: 可通之率(pack, flags),
      蔭: 蔭之率(pack, flags, hourIdx),
      無階: 無階可至者(pack, flags, 400),
      信: 信之分佈(pack),
      斷: 斷之率(pack, flags),
      陷: 熱陷(pack, flags, hourIdx, { 取樣數: 40, 取幾: 8, 種子: 20260824 }),
    };
  }, [pack, flags, hourIdx]);

  if (!pack) return <p className="py-8 text-muted-foreground">Loading city data…</p>;
  if (!報) return null;

  const 納涼無階 = 報.無階.filter((d) => d.kind === "cooling_center");
  const 公交無階 = 報.無階.filter((d) => d.kind === "transit_stop");
  const 總米 = 報.信.high.米 + 報.信.medium.米 + 報.信.low.米;
  const 有輪椅之欄 = pack.manifest.transit_wheelchair_field_present;
  const 站總 = pack.manifest.transit_stops_total ?? 0;
  const 停 = 停運之狀(pack);

  return (
    <main className="py-6">
      <header>
        <h1 className="h-lg">City audit</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Where this city fails its disabled residents, measured on{" "}
          {pack.edges.length.toLocaleString()} sidewalk segments.
        </p>
      </header>

      <ProfilePicker flags={flags} onChange={setFlags} />
      <TimeSlider
        buckets={pack.manifest.hour_buckets}
        index={hourIdx}
        onChange={setHourIdx}
      />

      <section
        ref={卡}
        aria-label="Network summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          序={0}
          題="Network traversable"
          數={百分(報.通.率)}
          註={`${公里(報.通.可通米)} of ${公里(報.通.總米)}`}
        />
        <MetricCard
          序={1}
          題={`Shaded at ${pack.manifest.hour_buckets[hourIdx]}:00`}
          數={百分(報.蔭.率)}
          註={`${公里(報.蔭.蔭米)} of traversable network`}
        />
        <MetricCard
          序={2}
          題="Sidewalk cut off for this profile"
          數={百分(報.斷.率)}
          註={`${報.斷.斷之節.toLocaleString()} of ${報.斷.眾人之節.toLocaleString()} connected points`}
        />
        <MetricCard
          序={3}
          題="Destinations with no step-free approach"
          數={String(納涼無階.length + 公交無階.length)}
          註={`of ${pack.destinations.length} within 400 m`}
        />
      </section>

      {站總 > 0 && 有輪椅之欄 === false && (
        <Reveal>
        <section aria-label="Transit accessibility data gap" className="mt-8">
          <h2 className="题-accent h-xs">Transit accessibility data is not published</h2>
          <p className="mt-1 max-w-[68ch] text-sm">
            The GTFS specification has carried a <code>wheelchair_boarding</code> field
            since 2011. {pack.manifest.name}'s published feeds omit that column
            entirely — not blank, absent — across every stop in both the bus and rail
            datasets.
          </p>
          <p className="mt-2 max-w-[68ch] text-sm">
            So for all <strong>{站總}</strong> stops in this area, whether a wheelchair
            user can board is <strong>unknown</strong> from published data. This tool
            will not guess. What it can measure is the sidewalk approach, reported
            above: reaching the stop is a separate problem from boarding at it, and only
            the first is answerable here.
          </p>
        </section>
        </Reveal>
      )}

      <Reveal>
      <section aria-label="Severance" className="mt-8">
        <h2 className="题-accent h-xs">What the traversable figure hides</h2>
        <p className="mt-1 max-w-[68ch] text-sm">
          <strong className="数">{百分(報.通.率)}</strong> of the sidewalk network is
          traversable for this profile, which sounds close to solved. It is not the
          number that matters. The blocked segments are mostly short flights of steps,
          and each one severs whatever sits behind it.
        </p>
        <p className="mt-2 max-w-[68ch] text-sm">
          Counting connectivity instead of length:{" "}
          <strong className="数">{報.斷.此身之節.toLocaleString()}</strong> points are
          reachable for this profile against{" "}
          <strong className="数">{報.斷.眾人之節.toLocaleString()}</strong> for an
          unrestricted pedestrian — <strong className="数">{報.斷.斷之節.toLocaleString()}</strong>{" "}
          points of usable sidewalk exist but cannot be reached.
        </p>
        {/*
          此語必自其數而出。前此書「皆在一百四米之內」—— 乃洛城之量,而施於十六城:
          量之,綠灣之最遠者三一七米,紐約四一八米,且有十處出其四百米之外。
          其上之卡正已算之,而其文顧不用其所算。
          MUST be derived. This read "Every destination here sits within 104 m",
          which is a Los Angeles measurement rendered over all sixteen cities —
          Green Bay's furthest is 317 m and New York has ten destinations beyond
          400 m. The card directly above already computes this; the prose was
          simply ignoring it.
        */}
        <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
          {報.無階.length === 0
            ? "Every destination in this extract sits within 400 m of the step-free network, so proximity is not the barrier here. Connectivity is."
            : `${報.無階.length} of the destinations in this extract sit more than 400 m from the step-free network — for the rest, proximity is not the barrier. Connectivity is.`}
        </p>
      </section>
      </Reveal>

      <Reveal>
      <section aria-label="Building height coverage" className="mt-8">
        <h2 className="题-accent h-xs">Building height coverage</h2>
        <p className="mt-1 max-w-[68ch] text-sm">
          Shade is computed by projecting building shadows, so it is only as good as
          OpenStreetMap's height data — and that varies enormously by city.{" "}
          <strong className="数">
            {(pack.manifest.buildings_total ?? 0).toLocaleString()}
          </strong>{" "}
          buildings here,{" "}
          <strong className="数">
            {Math.round(
              100 * (pack.manifest.buildings_assumed_height ?? 0) /
                Math.max(pack.manifest.buildings_total ?? 1, 1),
            )}%
          </strong>{" "}
          of them with no published height, filled in at an assumed 7 storeys.
        </p>
        {/*
          前此曰「鳳凰城已量而棄之,不為第三城」—— 而鳳凰城正在其城之列(第三),
          且其文書其比為六,而其實為九。二誤同出一處,皆二城之世之遺。
          This paragraph said Phoenix "was measured and rejected as a third city"
          while Phoenix is city #3 in the picker, and quoted 6% coverage where the
          landing quotes 9% (the real figure is 8.6%). Both errors are leftovers
          from when the project shipped two cities.
        */}
        <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
          For comparison: New York publishes heights for 95% of its downtown
          buildings and Los Angeles for 92%, while Las Vegas publishes them for
          6% and Green Bay for 2%. Across all thirty-eight downtowns, 47,375 of
          81,864 building footprints — 58% — have no published height at all.
          Where coverage is this thin the shade model is mostly inference, and
          the hatch marks say so on every segment.
        </p>
      </section>
      </Reveal>

      <Reveal>
      <section aria-label="Data confidence" className="mt-8">
        <h2 className="题-accent h-xs">Data confidence</h2>
        <p className="mt-1 max-w-[68ch] text-sm">
          Accessibility attributes come from OpenStreetMap. A segment is only{" "}
          <strong>high</strong> confidence when a wheelchair, kerb, or steps tag was
          explicitly present. Everything else was inferred, and an inferred segment is
          not a verified-passable one.
        </p>
        <ul className="mt-2 text-sm">
          {(["high", "medium", "low"] as const).map((k) => (
            <li key={k} className="border-b border-line py-1 last:border-0">
              <strong>{k}</strong>: {報.信[k].數.toLocaleString()} segments,{" "}
              {公里(報.信[k].米)} ({百分(總米 === 0 ? 0 : 報.信[k].米 / 總米)})
            </li>
          ))}
        </ul>
      </section>
      </Reveal>

      <Reveal>
      <section aria-label="Heat traps" className="mt-8">
        <h2 className="题-accent h-xs">Heat traps at {pack.manifest.hour_buckets[hourIdx]}:00</h2>
        <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
          Segments carrying the most foot traffic <em>and</em> the most sun. Traffic is
          estimated by sampling shortest paths, so these are approximate rankings, not
          measured counts.
        </p>
        {/*
          每條可點而見之於圖。
          前此但列其長與其曝 —— 三米、二十八米,無街名,無交口,無所在:
          是一榜而無一人能行其事。囊中之段本無其名(OSM 之 name 未入其囊),
          故不能書其街;而其兩端之節則有其號,以之為一路,則圖上自見此段。
          Each row was "3 m · exposure 100%" — no street, no cross street, no
          location, so nothing could be done with it. The pack carries no street
          names, but every edge knows its two end nodes, so routing between them
          puts exactly this segment on the map.
        */}
        <ol className="mt-2 max-w-[68ch] text-sm">
          {報.陷.map((x) => (
            <li key={x.edge.id} className="border-b border-line last:border-0">
              <a
                className="flex min-h-11 flex-wrap items-center gap-x-2 py-1 underline-offset-4 hover:underline"
                href={成址({
                  city: cityId, view: "route",
                  origin: x.edge.from, dest: x.edge.to,
                  flags, hourIdx,
                })}
              >
                <span className="数">{Math.round(x.edge.length_m)} m</span>
                <span className="text-muted-foreground">·</span>
                <span>exposure <span className="数">{(x.曝 * 100).toFixed(0)}%</span></span>
                {x.edge.confidence !== "high" && (
                  <span className="text-muted-foreground">· {x.edge.confidence} confidence</span>
                )}
                <span className="ml-auto text-xs text-accent-ink">Show on map →</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
      </Reveal>

      {停.有源 && (
        <Reveal>
        <section aria-label="Service disruption feed" className="mt-8">
          <h2 className="题-accent h-xs">Service disruption data</h2>
          <p className="mt-1 max-w-[68ch] text-sm">
            {pack.manifest.name} publishes no service-alerts endpoint. The nearest
            public equivalent is canceled trips, which currently reports{" "}
            <strong className="数">{停.總}</strong> canceled across{" "}
            <strong className="数">{Object.keys(停.路).length}</strong> routes.
          </p>

          {停.陳否 && (
            <p className="纹-low mt-2 rounded border border-line p-3 text-sm">
              <strong className="text-error">This feed is stale.</strong> It answers
              with a 200 and well-formed data, but its own timestamp reads{" "}
              <span className="数">{停.更新於 ?? "unknown"}</span>. Displaying it as
              current conditions would be a fabrication, so it is shown here as a data
              finding rather than as live information. Check the operator directly
              before relying on any of it.
            </p>
          )}

          {停.最甚.length > 0 && (
            <>
              <h3 className="mt-3 text-base font-semibold">Worst-affected routes</h3>
              <ul className="mt-1 text-sm">
                {停.最甚.slice(0, 6).map((x) => (
                  <li key={x.路} className="border-b border-line py-1 last:border-0">
                    Route <strong className="数">{x.路}</strong> —{" "}
                    <span className="数">{x.數}</span> canceled trips
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        </Reveal>
      )}

      <Reveal>
      <section aria-label="Paratransit" className="mt-8">
        <h2 className="题-accent h-xs">Paratransit</h2>
        <p className="mt-1 max-w-[68ch] text-sm">
          {pack.manifest.name}'s ADA paratransit operator requires advance booking. A
          wildfire or a heat emergency does not give that much notice, so the transit
          mode many disabled residents depend on is structurally unavailable in exactly
          the emergency that would require it. This is a policy finding, not a routing
          one — no public scheduling API exists to model it.
        </p>
      </section>
      </Reveal>
    </main>
  );
}
