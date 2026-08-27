import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags, RouteResult } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { route as computeRoute, nearestRoutableNode } from "../routing/astar";
import { fetchCurrentTempC } from "../data/weather";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { ExposureStrip } from "../components/ExposureStrip";
import { PlacePicker } from "../components/PlacePicker";
import { ReportForm } from "../components/ReportForm";
import { ReportList } from "../components/ReportList";
import { useReports } from "../hooks/useReports";
import { Button } from "@/components/ui/button";

const 午後 = 4; // hour_buckets[4] === 14:00, 暑之極

export function RouteView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>({
    wheelchair: false,
    blind_low_vision: false,
    heat_sensitive: false,
  });
  const [hourIdx, setHourIdx] = useState(午後);
  const [temp, setTemp] = useState({ tempC: 24, estimated: true });
  const [origin, setOrigin] = useState<number | null>(null);
  const [dest, setDest] = useState<number | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [status, setStatus] = useState("Select a start point on the map.");
  const { 报列, 罰, 寫: 寫报事, 同步中, 庫之誤, 就緒, 供給有無 } = useReports(cityId);
  // 所報之段,必由人自擇 —— 前此取路之中者,則报落於無干之段,其罚亦然。
  const [报之段, set报之段] = useState<number | null>(null);

  useEffect(() => {
    loadCityPack(cityId).then(setPack).catch((e: Error) => setLoadError(e.message));
  }, [cityId]);

  useEffect(() => {
    if (!pack) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    fetchCurrentTempC((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(setTemp);
  }, [pack]);

  const coordOf = useCallback(
    (id: number | null) => {
      if (!pack || id == null) return null;
      const n = pack.nodes.find((x) => x.id === id);
      return n ? { lon: n.lon, lat: n.lat } : null;
    },
    [pack],
  );

  // 以名擇地。node_id 為 -1 者,乃「用我之地」,其名載經緯,就近取節於此。
  const 擇地 = useCallback(
    (which: "origin" | "dest") => (nodeId: number | null, 名: string | null) => {
      if (!pack) return;
      let n = nodeId;
      if (nodeId === -1 && 名) {
        const [lon, lat] = 名.split(",").map(Number);
        n = nearestRoutableNode(pack, flags, lon, lat);
      }
      if (which === "origin") setOrigin(n);
      else setDest(n);
      if (n == null) setResult(null);
    },
    [pack, flags],
  );

  const onPick = useCallback(
    (lon: number, lat: number) => {
      if (!pack) return;
      const n = nearestRoutableNode(pack, flags, lon, lat);
      if (origin == null || dest != null) {
        setOrigin(n);
        setDest(null);
        setResult(null);
        setStatus("Start set. Now select a destination.");
      } else {
        setDest(n);
      }
    },
    [pack, flags, origin, dest],
  );

  useEffect(() => {
    if (!pack || origin == null || dest == null) return;
    const r = computeRoute(pack, flags, origin, dest, hourIdx, temp.tempC, 罰);
    setResult(r);
    set报之段(null);
    if (r) {
      const 未驗 = r.edges.filter((e) => e.confidence !== "high").length;
      setStatus(
        `Route found: ${Math.round(r.totalLength_m)} m, peak sun exposure ` +
          `${Math.round(r.maxExposure * 100)}%.` +
          (未驗 > 0
            ? ` ${未驗} of ${r.edges.length} segments have unverified accessibility data.`
            : ""),
      );
    } else {
      setStatus(
        "No route exists for this profile between those points. " +
          "The barrier is accessibility, not distance.",
      );
    }
  }, [pack, origin, dest, flags, hourIdx, temp, 罰]);

  const hourLabel = useMemo(
    () => (pack ? `${String(pack.manifest.hour_buckets[hourIdx]).padStart(2, "0")}:00` : ""),
    [pack, hourIdx],
  );

  if (loadError) {
    return (
      <main className="py-8">
        <h1 className="text-2xl font-semibold">Passable</h1>
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
          Passable — {pack.manifest.name}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Heat-safe, step-free walking routes over{" "}
          <span className="数">{pack.edges.length.toLocaleString()}</span> sidewalk segments.
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        className="mt-4 rounded-lg border border-line bg-panel px-4 py-3 text-sm"
      >
        {status}
      </p>

      {temp.estimated && (
        <p role="note" className="mt-2 text-sm text-midsun">
          Live weather is unavailable — routing is using an estimated{" "}
          <span className="数">{temp.tempC}</span>°C.
        </p>
      )}

      <div className="mt-4 grid items-start gap-4 md:grid-cols-[minmax(260px,1fr)_2fr]">
        <div>
          <PlacePicker
            pack={pack}
            label="Start"
            value={origin}
            onChange={擇地("origin")}
            allowLocate
          />
          <PlacePicker
            pack={pack}
            label="Destination"
            value={dest}
            onChange={擇地("dest")}
          />
          <ProfilePicker flags={flags} onChange={setFlags} />
          <TimeSlider
            buckets={pack.manifest.hour_buckets}
            index={hourIdx}
            onChange={setHourIdx}
          />
          <p className="text-xs text-muted-foreground">
            Routing at <span className="数">{hourLabel}</span>,{" "}
            <span className="数">{temp.tempC}</span>°C apparent.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              setOrigin(null);
              setDest(null);
              setResult(null);
              setStatus("Select a start point on the map.");
            }}
          >
            Reset points
          </Button>
        </div>

        <MapCanvas
          pack={pack}
          flags={flags}
          hourIdx={hourIdx}
          route={result}
          origin={coordOf(origin)}
          dest={coordOf(dest)}
          onPick={onPick}
        />
      </div>

      {result && (
        <section aria-label="Route detail" className="mt-6">
          <h2 className="text-lg font-semibold">Sun along this route</h2>
          <ExposureStrip edges={result.edges} hourIdx={hourIdx} className="mt-2" />

          <h2 className="mt-6 text-lg font-semibold">Directions</h2>
          <p className="text-sm text-muted-foreground">
            <span className="数">{Math.round(result.totalLength_m)}</span> m over{" "}
            <span className="数">{result.edges.length}</span> segments.
          </p>
          <ol className="mt-2 text-sm">
            {result.itinerary.map((step, i) => (
              <li
                key={i}
                className={`border-b border-line py-1.5 last:border-0 ${
                  step.edge.confidence === "low" ? "纹-low"
                    : step.edge.confidence === "medium" ? "纹-medium"
                      : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="数 mr-2 text-muted-foreground">{i + 1}</span>
                    {step.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => set报之段(step.edge.id)}
                    aria-pressed={报之段 === step.edge.id}
                    className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                      报之段 === step.edge.id
                        ? "border-ink bg-panel font-semibold"
                        : "border-line text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {报之段 === step.edge.id ? "Selected" : "Report this"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {result && result.edges.length > 0 && (
        <section aria-label="Report a problem" className="mt-6">
          {报之段 == null ? (
            <p className="rounded-lg border border-line p-4 text-sm text-muted-foreground">
              To report a problem, choose the segment it affects using “Report this” in
              the directions above. Reports attach to one segment, so picking the right
              one is what makes them useful to the next person.
            </p>
          ) : (
            <ReportForm
              city_id={cityId}
              edge_id={报之段}
              段之文={
                result.itinerary.find((x) => x.edge.id === 报之段)?.text ?? ""
              }
              段之序={
                result.itinerary.findIndex((x) => x.edge.id === 报之段) + 1
              }
              onSubmit={寫报事}
              就緒={就緒}
              庫之誤={庫之誤}
            />
          )}
        </section>
      )}

      <ReportList 报列={报列} 同步中={同步中} 供給有無={供給有無} />

      <footer className="mt-10 border-t border-line pt-4 text-xs text-muted-foreground">
        <p>
          Sun exposure is computed by projecting building shadows from{" "}
          <span className="数">
            {pack.manifest.buildings_total?.toLocaleString() ?? "local"}
          </span>{" "}
          building footprints against the sun's position, not from measured shade.
          {pack.manifest.buildings_assumed_height
            ? ` ${pack.manifest.buildings_assumed_height} of those have no height in
               OpenStreetMap and were assumed to be 7 storeys, so shade near them may be
               over- or under-stated.`
            : ""}
        </p>
        <p className="mt-2">
          Accessibility attributes come from OpenStreetMap and are incomplete — hatched
          segments above were not explicitly tagged, and an untagged segment is not a
          verified-passable one. This tool is not medical guidance; follow your own
          clinical advice about heat.
        </p>
      </footer>
    </main>
  );
}
