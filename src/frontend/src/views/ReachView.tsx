import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityPack, Destination, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { nearestRoutableNode } from "../routing/astar";
import { reach, reachableDestinations, budgetFor, type ReachResult } from "../routing/reach";
import { fetchCurrentTempC } from "../data/weather";
import { HAZARDS, resolveTemp, type Hazard } from "../data/hazards";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { HazardPicker } from "../components/HazardPicker";
import { BudgetSlider } from "../components/BudgetSlider";
import { DestinationList } from "../components/DestinationList";

const AFTERNOON_BUCKET = 4; // hour_buckets[4] === 14:00

const NO_PROFILE: ProfileFlags = {
  wheelchair: false,
  blind_low_vision: false,
  heat_sensitive: false,
};

export function ReachView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>(NO_PROFILE);
  const [powerDependent, setPowerDependent] = useState(false);
  const [hourIdx, setHourIdx] = useState(AFTERNOON_BUCKET);
  const [hazard, setHazard] = useState<Hazard>(HAZARDS[0]);
  const [liveTemp, setLiveTemp] = useState({ tempC: 24, estimated: true });
  const [budget, setBudget] = useState(budgetFor(NO_PROFILE));
  const [origin, setOrigin] = useState<number | null>(null);
  const [result, setResult] = useState<ReachResult | null>(null);
  const [status, setStatus] = useState("Select a starting point on the map.");

  useEffect(() => {
    loadCityPack(cityId)
      .then(setPack)
      .catch((err: Error) => setLoadError(err.message));
  }, [cityId]);

  useEffect(() => {
    if (!pack) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    fetchCurrentTempC((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(setLiveTemp);
  }, [pack]);

  // 身既易,則慎者之限隨之。
  useEffect(() => {
    setBudget(budgetFor(flags));
  }, [flags]);

  const tempC = resolveTemp(hazard, liveTemp.tempC);

  const onPick = useCallback(
    (lon: number, lat: number) => {
      if (!pack) return;
      setOrigin(nearestRoutableNode(pack, flags, lon, lat));
    },
    [pack, flags],
  );

  useEffect(() => {
    if (!pack || origin == null) return;
    const r = reach(pack, flags, origin, hourIdx, tempC, budget);
    setResult(r);
    const dests = reachableDestinations(pack, r);
    const cooling = dests.filter((d) => d.kind === "cooling_center").length;
    setStatus(
      cooling > 0
        ? `${r.reachableNodes.size.toLocaleString()} points reachable. ` +
            `${cooling} cooling centre${cooling === 1 ? "" : "s"} within budget.`
        : `${r.reachableNodes.size.toLocaleString()} points reachable. ` +
            "No cooling centre is reachable from here under this scenario.",
    );
  }, [pack, origin, flags, hourIdx, tempC, budget]);

  const split = useMemo(() => {
    const empty = { reachable: [] as Destination[], unreachable: [] as Destination[] };
    if (!pack || !result) return empty;
    const reachableSet = new Set(reachableDestinations(pack, result).map((d) => d.id));
    // 憩息之處數繁,列之則掩其要,故但列納涼避難之所。
    const named = pack.destinations.filter((d) => d.kind !== "rest_stop");
    return {
      reachable: named.filter((d) => reachableSet.has(d.id)),
      unreachable: named.filter((d) => !reachableSet.has(d.id)),
    };
  }, [pack, result]);

  const coordOf = (id: number | null) => {
    if (!pack || id == null) return null;
    const n = pack.nodes.find((x) => x.id === id);
    return n ? { lon: n.lon, lat: n.lat } : null;
  };

  if (loadError) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Reach</h1>
        <p role="alert">Could not load city data: {loadError}</p>
      </main>
    );
  }
  if (!pack) return <p style={{ padding: 24 }}>Loading city data…</p>;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>Reach — {pack.manifest.name}</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          What can you actually get to, and can you get out?
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "0.75rem 1rem",
        }}
      >
        {status}
      </p>

      <div
        className="layout"
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "minmax(280px, 1fr) 2fr",
          alignItems: "start",
        }}
      >
        <div>
          <ProfilePicker flags={flags} onChange={setFlags} />

          <label style={{ display: "flex", gap: "0.5rem", margin: "0.75rem 0" }}>
            <input
              type="checkbox"
              checked={powerDependent}
              onChange={(ev) => setPowerDependent(ev.target.checked)}
              style={{ marginTop: "0.25rem" }}
            />
            <span>
              <strong>Power-dependent</strong>
              <br />
              <small style={{ color: "var(--muted)" }}>
                Powered wheelchair, ventilator, refrigerated medication, or home dialysis.
                Shows backup-power status on destinations.
              </small>
            </span>
          </label>

          <HazardPicker value={hazard} onChange={setHazard} />
          <TimeSlider
            buckets={pack.manifest.hour_buckets}
            index={hourIdx}
            onChange={setHourIdx}
          />
          <BudgetSlider value={budget} onChange={setBudget} />

          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Routing at {tempC}°C{hazard.hypothetical ? " (hypothetical)" : ""}.
          </p>
        </div>

        <MapCanvas
          pack={pack}
          flags={flags}
          hourIdx={hourIdx}
          route={null}
          reachEdges={result?.reachableEdges}
          origin={coordOf(origin)}
          dest={null}
          onPick={onPick}
        />
      </div>

      {result && (
        <section aria-label="Destinations" style={{ marginTop: "1.5rem" }}>
          <h2>Destinations</h2>
          <DestinationList
            reachable={split.reachable}
            unreachable={split.unreachable}
            showPower={powerDependent}
          />
        </section>
      )}
    </main>
  );
}
