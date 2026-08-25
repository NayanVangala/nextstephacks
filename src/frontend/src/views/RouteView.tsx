import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags, RouteResult } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { route as computeRoute, nearestRoutableNode } from "../routing/astar";
import { fetchCurrentTempC } from "../data/weather";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";

const NOON_BUCKET = 4; // hour_buckets[4] === 14:00, 暑之極

export function RouteView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>({
    wheelchair: false,
    blind_low_vision: false,
    heat_sensitive: false,
  });
  const [hourIdx, setHourIdx] = useState(NOON_BUCKET);
  const [temp, setTemp] = useState({ tempC: 24, estimated: true });
  const [origin, setOrigin] = useState<number | null>(null);
  const [dest, setDest] = useState<number | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [status, setStatus] = useState("Select a start point on the map.");

  useEffect(() => {
    loadCityPack(cityId)
      .then(setPack)
      .catch((err: Error) => setLoadError(err.message));
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
    const r = computeRoute(pack, flags, origin, dest, hourIdx, temp.tempC);
    setResult(r);
    if (r) {
      const pct = Math.round(r.maxExposure * 100);
      const lowConfidence = r.edges.filter((e) => e.confidence !== "high").length;
      setStatus(
        `Route found: ${Math.round(r.totalLength_m)} m, peak sun exposure ${pct}%.` +
          (lowConfidence > 0
            ? ` ${lowConfidence} of ${r.edges.length} segments have unverified accessibility data.`
            : ""),
      );
    } else {
      setStatus(
        "No route exists for this profile between those points. " +
          "The barrier is accessibility, not distance.",
      );
    }
  }, [pack, origin, dest, flags, hourIdx, temp]);

  const reset = () => {
    setOrigin(null);
    setDest(null);
    setResult(null);
    setStatus("Select a start point on the map.");
  };

  const hourLabel = useMemo(
    () => (pack ? `${String(pack.manifest.hour_buckets[hourIdx]).padStart(2, "0")}:00` : ""),
    [pack, hourIdx],
  );

  if (loadError) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Passable</h1>
        <p role="alert">Could not load city data: {loadError}</p>
      </main>
    );
  }
  if (!pack) return <p style={{ padding: 24 }}>Loading city data…</p>;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>Passable — {pack.manifest.name}</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          Heat-safe, step-free walking routes. {pack.edges.length.toLocaleString()} sidewalk
          segments.
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

      {temp.estimated && (
        <p role="note" style={{ color: "#92400e" }}>
          Live weather is unavailable — routing is using an estimated {temp.tempC}°C.
        </p>
      )}

      <div className="layout" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(260px, 1fr) 2fr", alignItems: "start" }}>
        <div>
          <ProfilePicker flags={flags} onChange={setFlags} />
          <TimeSlider
            buckets={pack.manifest.hour_buckets}
            index={hourIdx}
            onChange={setHourIdx}
          />
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Routing at {hourLabel}, {temp.tempC}°C apparent.
          </p>
          <button type="button" onClick={reset}>
            Reset points
          </button>
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
        <section aria-label="Turn-by-turn directions" style={{ marginTop: "1.5rem" }}>
          <h2>Directions</h2>
          <p>
            {Math.round(result.totalLength_m)} m over {result.edges.length} segments.
          </p>
          <ol>
            {result.itinerary.map((step, i) => (
              <li key={i}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}

      <footer style={{ marginTop: "2rem", fontSize: "0.8rem", color: "var(--muted)" }}>
        <p>
          Sun exposure is computed by projecting building shadows from
          {" "}{pack.manifest.buildings_total?.toLocaleString() ?? "local"} building
          footprints against the sun's position, not from measured shade.
          {pack.manifest.buildings_assumed_height
            ? ` ${pack.manifest.buildings_assumed_height} of those have no height in
               OpenStreetMap and were assumed to be 7 storeys, so shade near them may be
               over- or under-stated.`
            : ""}
        </p>
        <p>
          Accessibility attributes come from OpenStreetMap and are incomplete — segments
          marked lower confidence were not explicitly tagged, and an untagged segment is
          not a verified-passable one. This tool is not medical guidance; follow your own
          clinical advice about heat.
        </p>
      </footer>
    </main>
  );
}
