import { useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { 可通之率, 蔭之率, 無階可至者, 信之分佈, 斷之率 } from "../report/度量";
import { 熱陷 } from "../report/熱陷";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { MetricCard } from "../components/MetricCard";
import { 停運之狀 } from "../data/停運";

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
        <h1 className="text-2xl font-semibold tracking-tight">
          Report — {pack.manifest.name}
        </h1>
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
        aria-label="Network summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          題="Network traversable"
          數={百分(報.通.率)}
          註={`${公里(報.通.可通米)} of ${公里(報.通.總米)}`}
        />
        <MetricCard
          題={`Shaded at ${pack.manifest.hour_buckets[hourIdx]}:00`}
          數={百分(報.蔭.率)}
          註={`${公里(報.蔭.蔭米)} of traversable network`}
        />
        <MetricCard
          題="Sidewalk cut off for this profile"
          數={百分(報.斷.率)}
          註={`${報.斷.斷之節.toLocaleString()} of ${報.斷.眾人之節.toLocaleString()} connected points`}
        />
        <MetricCard
          題="Destinations with no step-free approach"
          數={String(納涼無階.length + 公交無階.length)}
          註={`of ${pack.destinations.length} within 400 m`}
        />
      </section>

      {站總 > 0 && 有輪椅之欄 === false && (
        <section aria-label="Transit accessibility data gap" className="mt-8">
          <h2 className="text-lg font-semibold">Transit accessibility data is not published</h2>
          <p className="mt-1 text-sm">
            The GTFS specification has carried a <code>wheelchair_boarding</code> field
            since 2011. {pack.manifest.name}'s published feeds omit that column
            entirely — not blank, absent — across every stop in both the bus and rail
            datasets.
          </p>
          <p className="mt-2 text-sm">
            So for all <strong>{站總}</strong> stops in this area, whether a wheelchair
            user can board is <strong>unknown</strong> from published data. This tool
            will not guess. What it can measure is the sidewalk approach, reported
            above: reaching the stop is a separate problem from boarding at it, and only
            the first is answerable here.
          </p>
        </section>
      )}

      <section aria-label="Severance" className="mt-8">
        <h2 className="text-lg font-semibold">What the traversable figure hides</h2>
        <p className="mt-1 text-sm">
          <strong className="数">{百分(報.通.率)}</strong> of the sidewalk network is
          traversable for this profile, which sounds close to solved. It is not the
          number that matters. The blocked segments are mostly short flights of steps,
          and each one severs whatever sits behind it.
        </p>
        <p className="mt-2 text-sm">
          Counting connectivity instead of length:{" "}
          <strong className="数">{報.斷.此身之節.toLocaleString()}</strong> points are
          reachable for this profile against{" "}
          <strong className="数">{報.斷.眾人之節.toLocaleString()}</strong> for an
          unrestricted pedestrian — <strong className="数">{報.斷.斷之節.toLocaleString()}</strong>{" "}
          points of usable sidewalk exist but cannot be reached.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Every destination here sits within 104 m of the step-free network, so
          proximity is not the barrier in this bounding box. Connectivity is.
        </p>
      </section>

      <section aria-label="Data confidence" className="mt-8">
        <h2 className="text-lg font-semibold">Data confidence</h2>
        <p className="mt-1 text-sm">
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

      <section aria-label="Heat traps" className="mt-8">
        <h2 className="text-lg font-semibold">Heat traps at {pack.manifest.hour_buckets[hourIdx]}:00</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Segments carrying the most foot traffic <em>and</em> the most sun. Traffic is
          estimated by sampling shortest paths, so these are approximate rankings, not
          measured counts.
        </p>
        <ol className="mt-2 text-sm">
          {報.陷.map((x) => (
            <li key={x.edge.id} className="border-b border-line py-1 last:border-0">
              {Math.round(x.edge.length_m)} m · exposure {(x.曝 * 100).toFixed(0)}%
              {x.edge.confidence !== "high" && ` · ${x.edge.confidence} confidence`}
            </li>
          ))}
        </ol>
      </section>

      {停.有源 && (
        <section aria-label="Service disruption feed" className="mt-8">
          <h2 className="text-lg font-semibold">Service disruption data</h2>
          <p className="mt-1 text-sm">
            {pack.manifest.name} publishes no service-alerts endpoint. The nearest
            public equivalent is canceled trips, which currently reports{" "}
            <strong className="数">{停.總}</strong> canceled across{" "}
            <strong className="数">{Object.keys(停.路).length}</strong> routes.
          </p>

          {停.陳否 && (
            <p className="纹-low mt-2 rounded border border-line p-3 text-sm">
              <strong className="text-fullsun">This feed is stale.</strong> It answers
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
      )}

      <section aria-label="Paratransit" className="mt-8">
        <h2 className="text-lg font-semibold">Paratransit</h2>
        <p className="mt-1 text-sm">
          {pack.manifest.name}'s ADA paratransit operator requires advance booking. A
          wildfire or a heat emergency does not give that much notice, so the transit
          mode many disabled residents depend on is structurally unavailable in exactly
          the emergency that would require it. This is a policy finding, not a routing
          one — no public scheduling API exists to model it.
        </p>
      </section>
    </main>
  );
}
