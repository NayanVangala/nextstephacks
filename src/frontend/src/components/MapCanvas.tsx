import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityPack, Edge, ProfileFlags, RouteResult } from "../types";
import { edgeAllowed } from "../routing/graph";
import { 可為圖 } from "./圖之能";

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
  reachEdges,
  origin,
  dest,
  onPick,
}: {
  pack: CityPack;
  flags: ProfileFlags;
  hourIdx: number;
  route: RouteResult | null;
  reachEdges?: Edge[];
  origin: { lon: number; lat: number } | null;
  dest: { lon: number; lat: number } | null;
  onPick: (lon: number, lat: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  // 圖之不可立者,以其機無 WebGL2 也。此非罕見 —— 舊機、公司之鎖機、虛擬之桌、
  // 惡指紋而閉之者,皆然。
  const [圖之誤, set圖之誤] = useState(false);
  const ready = useRef(false);
  const markers = useRef<maplibregl.Marker[]>([]);
  // onPick 藏於 ref,免因其變而重建全圖。
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!ref.current) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;

    // MapLibre throws GPUInitializationError from its constructor when WebGL2 is
    // absent. Uncaught, that exception unwinds through React's commit phase and
    // unmounts the WHOLE app — the profile picker, the text itinerary, the
    // reports, everything — leaving a blank page. The map is the one part of
    // this tool that was always meant to be optional, so its failure must stay
    // local to itself.
    if (!可為圖()) {
      set圖之誤(true);
      return;
    }

    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: ref.current,
        style: STYLE,
        bounds: [minLon, minLat, maxLon, maxLat],
        fitBoundsOptions: { padding: 24 },
      });
    } catch {
      set圖之誤(true);
      return;
    }
    m.addControl(new maplibregl.NavigationControl({}), "top-right");
    m.on("click", (ev: maplibregl.MapMouseEvent) =>
      pickRef.current(ev.lngLat.lng, ev.lngLat.lat));

    m.on("load", () => {
      // flags 與 hourIdx 於此為初值,或已陳 —— 其更新賴下之 effect(deps
      // [pack, flags, hourIdx])。此非疏漏:若入 deps,則每易 profile 或時辰
      // 皆重建全圖,棄其縮放與位置。下之 effect 為必需,不可去。
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

      // 所及之網在路線之下,免其掩之。
      const emptyFc: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: "FeatureCollection",
        features: [],
      };
      m.addSource("reach", { type: "geojson", data: emptyFc });
      m.addLayer({
        id: "reach",
        type: "line",
        source: "reach",
        paint: { "line-color": "#7c3aed", "line-width": 3, "line-opacity": 0.8 },
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
      // 去之亦須守。半成之圖 remove 則擲,而 cleanup 之擲直達 React,全樹俱亡。
      try {
        m.remove();
      } catch {
        // 半成之圖,不可去亦不足害。
      }
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
    const src = m.getSource("reach") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: (reachEdges ?? []).map((e) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: e.geometry },
      })),
    });
  }, [reachEdges]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const src = m.getSource("route") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        // route.polyline 已正其向,不可復用 edges.flatMap —— 後者奔於段末而復返。
        coordinates: route ? route.polyline : [],
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

  if (圖之誤) {
    return (
      <div
        role="note"
        className="flex h-[42vh] min-h-[300px] w-full flex-col justify-center gap-2 rounded-lg border border-line bg-panel p-6 text-sm md:h-[58vh] md:min-h-[380px]"
      >
        <p className="font-semibold">The map cannot be drawn on this device.</p>
        <p className="text-muted-foreground">
          Maps here need WebGL2, which this browser or machine does not provide.
          Nothing else is affected: choose your start and destination by name
          above, and the full route is written out as a text itinerary below.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="application"
      aria-label={`Map of ${pack.manifest.name}. The same route is available as a text itinerary below.`}
      className="h-[42vh] min-h-[300px] w-full overflow-hidden rounded-lg border border-line md:h-[58vh] md:min-h-[380px]"
    />
  );
}
