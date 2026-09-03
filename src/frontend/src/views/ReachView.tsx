import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityPack, Destination, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { nearestRoutableNode } from "../routing/astar";
import { reach, reachableDestinations, budgetFor, type ReachResult } from "../routing/reach";
import { fetchCurrentTempC } from "../data/weather";
import { 取警, 暑之底, 限之減, 無警之狀, type 警之狀 } from "../data/警";
import { HeatAlert } from "../components/HeatAlert";
import { HAZARDS, resolveTemp, type Hazard } from "../data/hazards";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { HazardPicker } from "../components/HazardPicker";
import { BudgetSlider } from "../components/BudgetSlider";
import { DestinationList } from "../components/DestinationList";
import { PlacePicker } from "../components/PlacePicker";
import { Checkbox } from "@/components/ui/checkbox";
import { useEnter } from "../motion/useEnter";

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
  const [警狀, set警狀] = useState<警之狀>(無警之狀);
  const [budget, setBudget] = useState(budgetFor(NO_PROFILE));
  const [origin, setOrigin] = useState<number | null>(null);
  const [result, setResult] = useState<ReachResult | null>(null);
  const [status, setStatus] = useState("Select a starting point on the map.");
  // 左列諸器依序而起,同 RouteView。
  const 器 = useEnter<HTMLDivElement>({ 選: ":scope > *", 位移: 12, 間: 0.06, 憑: cityId });

  useEffect(() => {
    loadCityPack(cityId)
      .then(setPack)
      .catch((err: Error) => setLoadError(err.message));
  }, [cityId]);

  useEffect(() => {
    if (!pack) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    fetchCurrentTempC((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(setLiveTemp);
    取警((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(set警狀);
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
    // 警之下,其限乘減。所減者 HeatAlert 已明言,故人知其所以然。
    const 實限 = Math.round(budget * 限之減(警狀.警));
    const r = reach(pack, flags, origin, hourIdx, tempC, 實限, 暑之底(警狀.警));
    setResult(r);
    const dests = reachableDestinations(pack, r);
    const cooling = dests.filter((d) => d.kind === "cooling_center").length;
    setStatus(
      cooling > 0
        ? `${r.reachableNodes.size.toLocaleString()} points reachable. ` +
            `${cooling} cooling center${cooling === 1 ? "" : "s"} within budget.`
        : `${r.reachableNodes.size.toLocaleString()} points reachable. ` +
            "No cooling center is within your sun budget from here. Raising the budget or picking an earlier hour will widen the range.",
    );
  }, [pack, origin, flags, hourIdx, tempC, budget, 警狀]);

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

  /*
    節之表,一囊一立。
    前此每呼 coordOf 皆遍其節而求之,而其呼在 render 之中,一render 二呼 ——
    洛城一萬四千七百六十九節,紐約二萬四千九百三十二,則曳一桿、點一匣,
    皆再遍其全表。今以 Map 代之,一囊一立,其求為常數。
    coordOf was a linear scan over every node, called twice per render — 24,932
    nodes in New York, re-scanned on every slider step and every checkbox.
  */
  const 節之表 = useMemo(
    () => new Map(pack ? pack.nodes.map((n) => [n.id, n]) : []),
    [pack],
  );
  const coordOf = useCallback(
    (id: number | null) => {
      if (id == null) return null;
      const n = 節之表.get(id);
      return n ? { lon: n.lon, lat: n.lat } : null;
    },
    [節之表],
  );

  if (loadError) {
    return (
      <main className="py-6">
        <h1 className="h-lg">Reach</h1>
        <p role="alert" className="mt-2 text-error">
          Could not load city data: {loadError}
        </p>
      </main>
    );
  }
  if (!pack) return <p className="py-6 text-muted-foreground">Loading city data…</p>;

  return (
    <main className="py-6">
      <header>
        <h1 className="h-lg">Reach</h1>
        {/* 其問已在頂帶,此不復問,但言其法與其度。 */}
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everywhere within a distance or sun-exposure budget from one point —
          and what a heat emergency or transit outage takes out of it.
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        className="mt-4 rounded-lg border border-line bg-panel px-4 py-3 text-sm"
      >
        {status}
      </p>

      <HeatAlert 狀={警狀} />

      {/*
        ── 器與圖,一匣而已 ──────────────────────────────────────────────
        前此左器一匣,右圖一匣,並列而各有其框其角 —— 二物也,而其實一器。
        今合為一匣,中以一髮分之:所分者其職,非其身。
        The controls and the map were two separately bordered, separately
        rounded boxes sitting side by side, which reads as two things that
        happen to be adjacent. They are one instrument: one container, divided
        by a hairline rather than by a gap.
      */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-paper md:grid md:grid-cols-[minmax(280px,1fr)_2fr] md:divide-x md:divide-line">
        <div ref={器} className="p-4">
          {/* 指圖之途,自 PlacePicker 移出,故此面亦當自言之。見 RouteView 同處。 */}
          <p className="mb-3 text-xs text-muted-foreground">
            Search, pick a known place, or click straight on the map.
          </p>
          <PlacePicker
            pack={pack}
            label="Starting point"
            value={origin}
            onChange={(nodeId, 名) => {
              if (nodeId === -1 && 名) {
                const [lon, lat] = 名.split(",").map(Number);
                setOrigin(nearestRoutableNode(pack, flags, lon, lat));
              } else {
                setOrigin(nodeId);
              }
              if (nodeId == null) setResult(null);
            }}
            allowLocate
          />
          <ProfilePicker flags={flags} onChange={setFlags} />

          <label
            htmlFor="power-dependent"
            className="my-3 flex cursor-pointer items-start gap-2.5 rounded-md py-1.5 -mx-1 px-1 hover:bg-panel"
          >
            <Checkbox
              id="power-dependent"
              checked={powerDependent}
              onCheckedChange={(v) => setPowerDependent(v === true)}
              aria-describedby="power-dependent-hint"
              className="mt-0.5 size-5 shrink-0 after:absolute after:-inset-2"
            />
            <span className="leading-snug">
              <span className="block text-sm font-semibold">Power-dependent</span>
              <span id="power-dependent-hint" className="block text-xs text-muted-foreground">
                Powered wheelchair, ventilator, refrigerated medication, or home dialysis.
                Shows backup-power status on destinations.
              </span>
            </span>
          </label>

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
          <h2 className="题-accent mb-2 h-xs">Destinations</h2>
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
