import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityPack, Edge, ProfileFlags, RouteResult } from "../types";
import { edgeAllowed } from "../routing/graph";
import { 曝之色 } from "../routing/曝之色";

/**
 * 圖。Leaflet 而非 MapLibre。
 *
 * MapLibre needs WebGL2, and WebGL2 is exactly the assumption that turned this
 * whole app into a blank white page on machines that do not provide it:
 * locked-down corporate builds, low-end Android, VMs, remote desktop, and anyone
 * who disables WebGL to resist fingerprinting. That was found by accident during
 * a design review, not by testing, which is the part worth remembering.
 *
 * Leaflet draws raster tiles as plain <img> and the sidewalk network into a 2D
 * canvas. No GPU is involved anywhere, so that failure mode does not exist
 * rather than being handled. It is also roughly 800 KB smaller.
 *
 * 所失者:MapLibre 之 line-color interpolate。今每段自定其色 ——
 * 曝之色() 本已共用於帶與條,故其色不因此而異。
 */

/**
 * 二底圖,皆免鑰。
 *
 * CARTO was dropped: its free basemap tier gates on API key for production use
 * and serves a "key required" tile rather than an error, so the map degrades
 * into a wall of watermarks instead of failing in a way anyone could diagnose.
 * A dependency that fails by lying is worse than one that fails loudly.
 *
 * OSM standard: genuinely keyless. Its usage policy requires an identifying
 * User-Agent (browsers supply their own) and forbids bulk scraping; a routing
 * demo over three downtown extracts is well inside it.
 *
 * Esri World Imagery: keyless satellite, JPEG, verified to zoom 14+ over all
 * three study areas. Attribution is required and is set below.
 */
const 底圖 = {
  街: {
    名: "Street",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    屬: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    最大: 19,
  },
  星: {
    名: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    屬: "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    最大: 19,
  },
} as const;

/**
 * 段之色與粗。不可通者灰而細,可通者隨其曝。
 *
 * Blocked segments are drawn, not hidden. A barrier you cannot see is a barrier
 * you cannot report, and hiding it would make the network look complete.
 */
function 段之樣(
  e: Edge,
  flags: ProfileFlags,
  hourIdx: number,
  暗底: boolean,
): L.PathOptions {
  if (!edgeAllowed(e, flags)) {
    return {
      color: 暗底 ? "#e4e4e7" : "#a1a1aa",
      weight: 暗底 ? 1.4 : 1,
      opacity: 暗底 ? 0.7 : 0.5,
      interactive: false,
    };
  }
  const 曝 = e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1;
  return {
    color: 曝之色(曝),
    weight: 暗底 ? 2.4 : 1.8,
    opacity: 暗底 ? 1 : 0.75,
    interactive: false,
  };
}

/** leaflet 需 [lat, lon];而囊中所存者 [lon, lat]。此易之。 */
function 反其座(g: [number, number][]): L.LatLngExpression[] {
  return g.map(([lon, lat]) => [lat, lon] as L.LatLngExpression);
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
  const map = useRef<L.Map | null>(null);
  // 諸層各自為一 —— 更其一不必重立其餘。
  const 網層 = useRef<L.LayerGroup | null>(null);
  const 所及層 = useRef<L.LayerGroup | null>(null);
  const 路層 = useRef<L.LayerGroup | null>(null);
  const 標層 = useRef<L.LayerGroup | null>(null);
  const [圖之誤, set圖之誤] = useState<string | null>(null);
  // 底圖暗則線須加明。星之像暗,淡藍之線幾不可見。
  const [暗底, set暗底] = useState(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!ref.current) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;

    let m: L.Map;
    try {
      m = L.map(ref.current, {
        // canvas 之 renderer:萬六千段各為一 SVG 元,則 DOM 不勝其繁。
        // 此 canvas 乃二維,非 WebGL —— 故仍無所賴於 GPU。
        preferCanvas: true,
        zoomControl: true,
        attributionControl: true,
      });
      m.fitBounds([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);
      // 街為常,星為選。二者並列於 layer control,人自擇之。
      // Satellite is genuinely useful here and not decoration: shade is modelled
      // from building footprints, and imagery is how a person checks whether the
      // buildings casting those shadows are actually there.
      const 街層 = L.tileLayer(底圖.街.url, {
        attribution: 底圖.街.屬,
        maxZoom: 底圖.街.最大,
        detectRetina: true,
      }).addTo(m);
      const 星層 = L.tileLayer(底圖.星.url, {
        attribution: 底圖.星.屬,
        maxZoom: 底圖.星.最大,
      });
      L.control
        .layers(
          { [底圖.街.名]: 街層, [底圖.星.名]: 星層 },
          undefined,
          { position: "topright", collapsed: false },
        )
        .addTo(m);

      // 星之下,網之色須加其明 —— 淡色之線沒於暗像之中。
      m.on("baselayerchange", (ev: L.LayersControlEvent) => {
        set暗底(ev.name === 底圖.星.名);
      });
    } catch (誤) {
      // Leaflet 不賴 GPU,故此路罕至;然容器之高為零、瓦之網斷,皆可致之。
      set圖之誤(誤 instanceof Error ? 誤.message : String(誤));
      return;
    }

    m.on("click", (ev: L.LeafletMouseEvent) =>
      pickRef.current(ev.latlng.lng, ev.latlng.lat));

    網層.current = L.layerGroup().addTo(m);
    所及層.current = L.layerGroup().addTo(m);
    路層.current = L.layerGroup().addTo(m);
    標層.current = L.layerGroup().addTo(m);
    map.current = m;

    // 容器之寬高,於 grid 未定之時或為零。觀而復量之。
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      網層.current = null;
      所及層.current = null;
      路層.current = null;
      標層.current = null;
    };
  }, [pack]);

  // 網之色隨時辰、隨身而更。
  useEffect(() => {
    const g = 網層.current;
    if (!g) return;
    g.clearLayers();
    for (const e of pack.edges) {
      L.polyline(反其座(e.geometry), 段之樣(e, flags, hourIdx, 暗底)).addTo(g);
    }
  }, [pack, flags, hourIdx, 暗底]);

  useEffect(() => {
    const g = 所及層.current;
    if (!g) return;
    g.clearLayers();
    for (const e of reachEdges ?? []) {
      L.polyline(反其座(e.geometry), {
        color: "#7c3aed", weight: 3, opacity: 0.8, interactive: false,
      }).addTo(g);
    }
  }, [reachEdges]);

  useEffect(() => {
    const g = 路層.current;
    if (!g) return;
    g.clearLayers();
    if (!route) return;
    // route.polyline 已正其向 —— 段之四分之一逆行,照存之序則線奔而復返。
    const pts = 反其座(route.polyline);
    L.polyline(pts, { color: "#052e16", weight: 9, opacity: 0.9, interactive: false }).addTo(g);
    L.polyline(pts, { color: "#22c55e", weight: 5, interactive: false }).addTo(g);
  }, [route]);

  useEffect(() => {
    const g = 標層.current;
    if (!g) return;
    g.clearLayers();
    const 置 = (p: { lon: number; lat: number }, 色: string, 名: string) => {
      L.circleMarker([p.lat, p.lon], {
        radius: 8, color: "#fff", weight: 2, fillColor: 色, fillOpacity: 1,
      })
        .bindTooltip(名)
        .addTo(g);
    };
    if (origin) 置(origin, "#2563eb", "Start");
    if (dest) 置(dest, "#dc2626", "Destination");
  }, [origin, dest]);

  if (圖之誤) {
    return (
      <div
        role="note"
        className="flex h-[42vh] min-h-[300px] w-full flex-col justify-center gap-2 rounded-lg border border-line bg-panel p-6 text-sm md:h-[58vh] md:min-h-[380px]"
      >
        <p className="font-semibold">The map could not be drawn.</p>
        <p className="text-muted-foreground">
          Nothing else is affected: choose your start and destination by name
          above, and the full route is written out as a text itinerary below.
        </p>
        <p className="text-xs text-muted-foreground">{圖之誤}</p>
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
