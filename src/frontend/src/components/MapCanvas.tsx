import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityPack, Edge, ProfileFlags, RouteResult } from "../types";
import { edgeAllowed } from "../routing/graph";
import { 曝之階 } from "../routing/曝之色";
import { ExposureKey } from "./ExposureStrip";

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
/**
 * 曝之實色。canvas 不解 var(),故必先取其實。
 *
 * Leaflet runs with preferCanvas here, and a canvas stroke of "var(--color-
 * shade)" is not an error — it silently paints black. Every segment on this map
 * was therefore drawn black regardless of its sun exposure, which is the one
 * thing the map exists to show. Resolved against the live document so the ramp
 * follows the theme.
 */
interface 板 {
  shade: string;
  midsun: string;
  fullsun: string;
  route: string;
  routeUnder: string;
  reach: string;
  origin: string;
  dest: string;
}

function 取曝之板(): 板 {
  const s = getComputedStyle(document.documentElement);
  const 取 = (名: string, 底: string) =>
    s.getPropertyValue(`--color-${名}`).trim() || 底;
  /*
    其資之階既取於其籤,而其路、其所及、其標,前此皆書淡地之實值 ——
    #7c3aed、#22c55e、#2563eb、#dc2626。故於暗底,路與所及最晦,
    而其始之標(#2563eb)去 --color-shade(#4d9fff)不過一階,
    是以人視其始,若視一在蔭之段 —— 正 index.css 所戒者。
    The ramp was resolved from tokens and then every other colour on the map was
    hard-coded to the light palette. Two consequences: route and reach were the
    muddiest possible choice over dark tiles, and the origin marker sat one hue
    step from the shade colour, so the start pin read as a shaded segment.
  */
  return {
    shade: 取("shade", "#4d9fff"),
    midsun: 取("midsun", "#f5b23c"),
    fullsun: 取("fullsun", "#ff5f4d"),
    route: 取("route", "#2ee6a8"),
    routeUnder: 取("canvas", "#090c13"),
    reach: 取("reach", "#b28bff"),
    origin: 取("accent-ink", "#22d3c5"),
    dest: 取("fullsun", "#ff5f4d"),
  };
}

/*
  網之重。
  一萬六千段,粗二點四而不透,則其圖為一片赤網 —— 底圖盡沒,而所問之路
  與其網同其聲。凡圖之善者,其底靜而其答鳴;此則舉圖皆鳴,故無所鳴。

  所存者其色 —— 曝之階,此物之所以為此物也;所減者其重與其濃。
  既有路,則網再退,使路為其形而網為其地。網之退非隱:段猶可辨,
  猶可讀其暑蔭,但不復與所求者爭。

  16,304 segments at weight 2.4 and full opacity render as a solid mesh: the
  base map disappears and the answer to the user's question carries no more
  visual weight than the 16,303 segments that are not the answer. The exposure
  colour is the product and stays; what drops is stroke weight and opacity.
  When a route exists the network steps back further so the route reads as
  figure against ground — still legible as heat, no longer competing.
*/
function 段之樣(
  e: Edge,
  flags: ProfileFlags,
  hourIdx: number,
  暗底: boolean,
  板: 板,
  有路: boolean,
): L.PathOptions {
  if (!edgeAllowed(e, flags)) {
    return {
      color: 暗底 ? "#e4e4e7" : "#a1a1aa",
      weight: 暗底 ? 1.2 : 1,
      opacity: 有路 ? 0.28 : 暗底 ? 0.5 : 0.4,
      interactive: false,
    };
  }
  const 曝 = e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1;
  return {
    color: 板[曝之階(曝)],
    weight: 暗底 ? 1.7 : 1.4,
    opacity: 有路 ? (暗底 ? 0.42 : 0.35) : 暗底 ? 0.82 : 0.62,
    interactive: false,
  };
}

/** leaflet 需 [lat, lon];而囊中所存者 [lon, lat]。此易之。 */
function 反其座(g: [number, number][]): L.LatLngExpression[] {
  return g.map(([lon, lat]) => [lat, lon] as L.LatLngExpression);
}

/**
 * 暗題乎。ThemeToggle 立其 data-theme 於 html,晝則無其屬(晝印為其本)。
 *
 * 名必為 ASCII。hook 之名,React 辨之以 /^use[A-Z]/ —— "use" 而繼以中文者,
 * rules-of-hooks 不能驗之而報其誤。見 CLAUDE.md。
 *
 * 用 MutationObserver 而不用 context:其屬亦由 index.html 之先畫之script所立,
 * 早於 React,故必觀其實,不可但聽其變。
 * Observes the attribute rather than taking it from React state, because the
 * pre-paint script in index.html sets it before React exists. Paper is the base
 * theme now, so "no attribute" means the day pull.
 */
function useDarkTheme(): boolean {
  const [暗, set暗] = useState(
    () => typeof document !== "undefined"
      && document.documentElement.dataset.theme === "dark",
  );
  useEffect(() => {
    const 讀 = () => set暗(document.documentElement.dataset.theme === "dark");
    讀();
    const o = new MutationObserver(讀);
    o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => o.disconnect();
  }, []);
  return 暗;
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
  // 星之像自暗。街之瓦本淡,而暗題則反其色,故亦暗 —— 見下之 useDarkTheme。
  const [星底, set星底] = useState(false);
  const 暗題 = useDarkTheme();
  /*
    底圖暗則線須加明。淡藍之線沒於暗像之中,故加其粗、加其明。
    A dark ground needs brighter, thicker strokes: the shade end of the exposure
    ramp is a light blue that all but disappears over dark imagery. This used to
    track the satellite layer alone, which was correct while the app was light —
    now the street tiles are inverted under the dark theme, so they need it too.
  */
  const 暗底 = 星底 || 暗題;
  /*
    有路與否,但取其有無 —— 網之效以此為其憑。
    MUST stay a boolean, never `route` itself: the network effect redraws all
    16,304 polylines, so keying it to the route object would rebuild the whole
    network on every recomputation instead of only when a route appears or
    disappears.
  */
  const 有路 = route != null;
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
      /*
        街之瓦有其籤,乃可獨反其色 —— 見 index.css 之 .街瓦。
        The class is what lets the dark theme invert the street tiles WITHOUT
        touching the satellite layer: inverted aerial imagery is unreadable.
      */
      const 街層 = L.tileLayer(底圖.街.url, {
        attribution: 底圖.街.屬,
        maxZoom: 底圖.街.最大,
        detectRetina: true,
        className: "街瓦",
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
        set星底(ev.name === 底圖.星.名);
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

  /*
    網之色隨時辰、隨身而更。題易則其板亦易 —— 暗淡二階不同其值,
    故 暗題 亦在其 dep 之中(其板讀諸 DOM,非 React 所能見)。
    暗題 is a real dependency even though nothing in the body names it: 取曝之板
    reads the computed custom properties off the document, which change when the
    theme does. Deriving it here rather than in a useMemo keeps that honest.
  */
  useEffect(() => {
    const g = 網層.current;
    if (!g) return;
    const 板 = 取曝之板();
    g.clearLayers();
    for (const e of pack.edges) {
      L.polyline(反其座(e.geometry), 段之樣(e, flags, hourIdx, 暗底, 板, 有路)).addTo(g);
    }
  }, [pack, flags, hourIdx, 暗底, 暗題, 有路]);

  useEffect(() => {
    const g = 所及層.current;
    if (!g) return;
    g.clearLayers();
    const 板 = 取曝之板();
    for (const e of reachEdges ?? []) {
      L.polyline(反其座(e.geometry), {
        color: 板.reach, weight: 3, opacity: 0.85, interactive: false,
      }).addTo(g);
    }
    // 暗題易則其板易 —— 其值讀諸 DOM,非 React 所能見,故必列於此。
  }, [reachEdges, 暗題]);

  useEffect(() => {
    const g = 路層.current;
    if (!g) return;
    g.clearLayers();
    if (!route) return;
    // route.polyline 已正其向 —— 段之四分之一逆行,照存之序則線奔而復返。
    const pts = 反其座(route.polyline);
    const 板 = 取曝之板();
    // 其下一道暗者,所以別其路於其網 —— 取地之色,故不為第四色。
    L.polyline(pts, { color: 板.routeUnder, weight: 9, opacity: 0.9, interactive: false }).addTo(g);
    L.polyline(pts, { color: 板.route, weight: 5, interactive: false }).addTo(g);
  }, [route, 暗題]);

  useEffect(() => {
    const g = 標層.current;
    if (!g) return;
    g.clearLayers();
    const 板 = 取曝之板();
    const 置 = (p: { lon: number; lat: number }, 色: string, 名: string) => {
      L.circleMarker([p.lat, p.lon], {
        radius: 8, color: "#fff", weight: 2, fillColor: 色, fillOpacity: 1,
      })
        .bindTooltip(名)
        .addTo(g);
    };
    if (origin) 置(origin, 板.origin, "Start");
    if (dest) 置(dest, 板.dest, "Destination");
  }, [origin, dest, 暗題]);

  if (圖之誤) {
    return (
      <div
        role="note"
        className="flex h-[42vh] min-h-[300px] w-full flex-col justify-center gap-2 bg-panel p-6 text-sm md:h-full md:min-h-[520px]"
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
    /*
      鑰釘於圖中,不待路而見 —— 圖自初載即以其色畫其全網,則其鑰不可俟。
      leaflet 主其內之一層,故不可置子於其中;別為一外層,而鑰浮其上。
      z 取五百:逾其瓦,而不及 leaflet 之控(千),故不奪其縮放之鈕。
      Leaflet owns its container's children, so the key sits in a wrapper
      instead. z-500 clears the tiles and stays under Leaflet's own controls at
      z-1000, so it can never cover the zoom buttons.
    */
    <div className="relative h-[42vh] min-h-[300px] w-full overflow-hidden md:h-full md:min-h-[520px]">
      <div
        ref={ref}
        role="application"
        aria-label={`Map of ${pack.manifest.name}. The same route is available as a text itinerary below.`}
        className="absolute inset-0"
      />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-md bg-paper/90 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        <ExposureKey />
      </div>
    </div>
  );
}
