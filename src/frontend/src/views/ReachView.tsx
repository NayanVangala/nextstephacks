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
import { Checkbox } from "@/components/ui/checkbox";

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
      <main className="py-8">
        <h1 className="text-2xl font-semibold">Reach</h1>
        <p role="alert" className="mt-2 text-fullsun">
          Could not load city data: {loadError}
        </p>
      </main>
    );
  }
  if (!pack) return <p className="py-8 text-muted-foreground">Loading city data…</p>;

  return (
    <main className="py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reach — {pack.manifest.name}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What can you actually get to, and can you get out?
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        className="mt-4 rounded-lg border border-line bg-panel px-4 py-3 text-sm"
      >
        {status}
      </p>

      <div className="mt-4 grid items-start gap-4 md:grid-cols-[minmax(280px,1fr)_2fr]">
        <div>
          <ProfilePicker flags={flags} onChange={setFlags} />

          <div className="my-3 flex items-start gap-2.5">
            <Checkbox
              id="power-dependent"
              checked={powerDependent}
              onCheckedChange={(v) => setPowerDependent(v === true)}
              aria-describedby="power-dependent-hint"
              className="mt-0.5"
            />
            <div className="leading-snug">
              <label htmlFor="power-dependent" className="text-sm font-semibold">
                Power-dependent
              </label>
              <p id="power-dependent-hint" className="text-xs text-muted-foreground">
                Powered wheelchair, ventilator, refrigerated medication, or home dialysis.
                Shows backup-power status on destinations.
              </p>
            </div>
          </div>

          <HazardPicker value={hazard} onChange={setHazard} />
          <TimeSlider
            buckets={pack.manifest.hour_buckets}
            index={hourIdx}
            onChange={setHourIdx}
          />
          <BudgetSlider value={budget} onChange={setBudget} />

          <p className="text-xs text-muted-foreground">
            Routing at <span className="数">{tempC}</span>°C
            {hazard.hypothetical ? " (hypothetical)" : ""}.
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
        <section aria-label="Destinations" className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Destinations</h2>
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
