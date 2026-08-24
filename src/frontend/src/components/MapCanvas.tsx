import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityPack, ProfileFlags, RouteResult } from "../types";
import { edgeAllowed } from "../routing/graph";

// CARTO Positron: 免鑰而可用,且色淡,不奪路線之目。
const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** 網之幾何隨 profile 而變,隨時辰而易色。 */
function networkGeoJSON(
  pack: CityPack,
  flags: ProfileFlags,
  hourIdx: number,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: pack.edges.map((e) => ({
      type: "Feature",
      properties: {
        // 不可通者著之以灰,使障礙可見,非隱之。
        blocked: edgeAllowed(e, flags) ? 0 : 1,
        exposure: e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1,
      },
      geometry: { type: "LineString", coordinates: e.geometry },
    })),
  };
}

export function MapCanvas({
  pack,
  flags,
  hourIdx,
  route,
  origin,
  dest,
  onPick,
}: {
  pack: CityPack;
  flags: ProfileFlags;
  hourIdx: number;
  route: RouteResult | null;
  origin: { lon: number; lat: number } | null;
  dest: { lon: number; lat: number } | null;
  onPick: (lon: number, lat: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const markers = useRef<maplibregl.Marker[]>([]);
  // onPick 藏於 ref,免因其變而重建全圖。
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!ref.current) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const m = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      bounds: [minLon, minLat, maxLon, maxLat],
      fitBoundsOptions: { padding: 24 },
    });
    m.addControl(new maplibregl.NavigationControl({}), "top-right");
    m.on("click", (ev: maplibregl.MapMouseEvent) =>
      pickRef.current(ev.lngLat.lng, ev.lngLat.lat));

    m.on("load", () => {
      m.addSource("network", {
        type: "geojson",
        data: networkGeoJSON(pack, flags, hourIdx),
      });
      m.addLayer({
        id: "network",
        type: "line",
        source: "network",
        paint: {
          // 曝愈甚則色愈赤,蔭處則青。障礙則灰。
          "line-color": [
            "case",
            ["==", ["get", "blocked"], 1],
            "#a1a1aa",
            [
              "interpolate", ["linear"], ["get", "exposure"],
              0, "#1d4ed8",
              0.5, "#a16207",
              1, "#dc2626",
            ],
          ],
          "line-width": ["case", ["==", ["get", "blocked"], 1], 1, 1.8],
          "line-opacity": ["case", ["==", ["get", "blocked"], 1], 0.5, 0.75],
        },
      });

      const empty: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      };
      m.addSource("route", { type: "geojson", data: empty });
      m.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        paint: { "line-color": "#052e16", "line-width": 9, "line-opacity": 0.9 },
      });
      m.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": "#22c55e", "line-width": 5 },
      });
      ready.current = true;
    });

    // The map is created before the surrounding grid has settled its columns,
    // so MapLibre latches onto a stale container size. Observe and re-resize.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(ref.current);

    if (import.meta.env.DEV) {
      (window as unknown as { __map?: maplibregl.Map }).__map = m;
    }

    map.current = m;
    return () => {
      ro.disconnect();
      ready.current = false;
      m.remove();
      map.current = null;
    };
  }, [pack]);

  // 網之色隨時辰、隨身而更。
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const src = m.getSource("network") as maplibregl.GeoJSONSource | undefined;
    src?.setData(networkGeoJSON(pack, flags, hourIdx));
  }, [pack, flags, hourIdx]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const src = m.getSource("route") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route ? route.edges.flatMap((e) => e.geometry) : [],
      },
    });
  }, [route]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    const place = (p: { lon: number; lat: number }, color: string, label: string) => {
      const mk = new maplibregl.Marker({ color })
        .setLngLat([p.lon, p.lat])
        .setPopup(new maplibregl.Popup().setText(label))
        .addTo(m);
      markers.current.push(mk);
    };
    if (origin) place(origin, "#2563eb", "Start");
    if (dest) place(dest, "#dc2626", "Destination");
  }, [origin, dest]);

  return (
    <div
      ref={ref}
      role="application"
      aria-label={`Map of ${pack.manifest.name}. The same route is available as a text itinerary below.`}
      style={{
        height: "58vh",
        minHeight: 380,
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--line)",
      }}
    />
  );
}
