import { useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { 可通之率, 蔭之率, 無階可至者, 信之分佈 } from "../report/度量";
import { 熱陷 } from "../report/熱陷";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { 度量卡 } from "../components/度量卡";

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
      陷: 熱陷(pack, flags, hourIdx, { 取樣數: 40, 取幾: 8, 種子: 20260824 }),
    };
  }, [pack, flags, hourIdx]);

  if (!pack) return <p style={{ padding: 24 }}>Loading city data…</p>;
  if (!報) return null;

  const 納涼無階 = 報.無階.filter((d) => d.kind === "cooling_center");
  const 公交無階 = 報.無階.filter((d) => d.kind === "transit_stop");
  const 總米 = 報.信.high.米 + 報.信.medium.米 + 報.信.low.米;
  const 有輪椅之欄 = pack.manifest.transit_wheelchair_field_present;
  const 站總 = pack.manifest.transit_stops_total ?? 0;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>Report — {pack.manifest.name}</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
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
        style={{
          display: "grid",
          gap: "0.75rem",
          marginTop: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <度量卡
          題="Network traversable"
          數={百分(報.通.率)}
          註={`${公里(報.通.可通米)} of ${公里(報.通.總米)}`}
        />
        <度量卡
          題={`Shaded at ${pack.manifest.hour_buckets[hourIdx]}:00`}
          數={百分(報.蔭.率)}
          註={`${公里(報.蔭.蔭米)} of traversable network`}
        />
        <度量卡
          題="Cooling centres with no step-free approach"
          數={String(納涼無階.length)}
          註="no connected sidewalk within 400 m"
        />
        <度量卡
          題="Transit stops with no step-free approach"
          數={String(公交無階.length)}
          註={站總 ? `of ${站總} stops in this area` : "GTFS not loaded"}
        />
      </section>

      {站總 > 0 && 有輪椅之欄 === false && (
        <section aria-label="Transit accessibility data gap" style={{ marginTop: "2rem" }}>
          <h2>Transit accessibility data is not published</h2>
          <p>
            The GTFS specification has carried a <code>wheelchair_boarding</code> field
            since 2011. {pack.manifest.name}'s published feeds omit that column
            entirely — not blank, absent — across every stop in both the bus and rail
            datasets.
          </p>
          <p>
            So for all <strong>{站總}</strong> stops in this area, whether a wheelchair
            user can board is <strong>unknown</strong> from published data. This tool
            will not guess. What it can measure is the sidewalk approach, reported
            above: reaching the stop is a separate problem from boarding at it, and only
            the first is answerable here.
          </p>
        </section>
      )}

      <section aria-label="Data confidence" style={{ marginTop: "2rem" }}>
        <h2>Data confidence</h2>
        <p>
          Accessibility attributes come from OpenStreetMap. A segment is only{" "}
          <strong>high</strong> confidence when a wheelchair, kerb, or steps tag was
          explicitly present. Everything else was inferred, and an inferred segment is
          not a verified-passable one.
        </p>
        <ul>
          {(["high", "medium", "low"] as const).map((k) => (
            <li key={k}>
              <strong>{k}</strong>: {報.信[k].數.toLocaleString()} segments,{" "}
              {公里(報.信[k].米)} ({百分(總米 === 0 ? 0 : 報.信[k].米 / 總米)})
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Heat traps" style={{ marginTop: "2rem" }}>
        <h2>Heat traps at {pack.manifest.hour_buckets[hourIdx]}:00</h2>
        <p>
          Segments carrying the most foot traffic <em>and</em> the most sun. Traffic is
          estimated by sampling shortest paths, so these are approximate rankings, not
          measured counts.
        </p>
        <ol>
          {報.陷.map((x) => (
            <li key={x.edge.id}>
              {Math.round(x.edge.length_m)} m · exposure {(x.曝 * 100).toFixed(0)}%
              {x.edge.confidence !== "high" && ` · ${x.edge.confidence} confidence`}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Paratransit" style={{ marginTop: "2rem" }}>
        <h2>Paratransit</h2>
        <p>
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
