import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags, RouteResult } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { route as computeRoute, nearestRoutableNode } from "../routing/astar";
import { fetchCurrentTempC } from "../data/weather";
import { 取警, 暑之底, 無警之狀, type 警之狀 } from "../data/警";
import { HeatAlert } from "../components/HeatAlert";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { ExposureStrip } from "../components/ExposureStrip";
import { PlacePicker } from "../components/PlacePicker";
import { ReportForm } from "../components/ReportForm";
import { ReportList } from "../components/ReportList";
import { MetricCard } from "../components/MetricCard";
import { useReports } from "../hooks/useReports";
import { Button } from "@/components/ui/button";
import { useEnter } from "../motion/useEnter";
import { 算遲行之利 } from "../routing/cost";
import { 阻之故, 阻之文, type 阻之報 } from "../routing/阻";
import { 解址, 成址, 驗其節 } from "../data/路之址";
import { 曝之色, 曝之文 } from "../routing/曝之色";
import { 幾時之前 } from "../data/报之重";
import { effectiveExposure } from "../routing/cost";

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
  const [警狀, set警狀] = useState<警之狀>(無警之狀);
  const 址之初 = useMemo(() => 解址(), []);
  const [origin, setOrigin] = useState<number | null>(null);
  const [dest, setDest] = useState<number | null>(null);
  // 陳鏈之告。址有節而囊無之,則明言之,不默然歸於空。
  const [陳鏈, set陳鏈] = useState(false);
  const [阻, set阻] = useState<阻之報 | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [status, setStatus] = useState("Select a start point on the map.");
  const { 报列, 罰, 段狀, 寫: 寫报事, 表態, 同步中, 庫之誤, 就緒, 供給有無 } = useReports(cityId);
  // 左列諸器依序而起,一入而已。易城則重動之。
  const 器 = useEnter<HTMLDivElement>({ 選: ":scope > *", 位移: 12, 間: 0.06, 憑: cityId });
  /*
    四數依序而起,以識其為新得之答。
    其憑但取起訖,不取時序 —— 曳其桿則時序逐格而變,若并憑之,
    則每格一動,是以動擾其用,非以動助其讀。新路乃為新答,易時非也。
    Keyed on origin/destination only, NOT the hour. The hour changes on every
    step of a slider drag, and re-running a stagger on each step would animate
    over someone mid-interaction. A new route is a new answer; a new hour is the
    same answer re-read.
  */
  const 數列 = useEnter<HTMLDivElement>({
    選: ":scope > *", 位移: 8, 間: 0.05, 憑: `${origin}|${dest}`,
  });
  // 所報之段,必由人自擇 —— 前此取路之中者,則报落於無干之段,其罚亦然。
  const [报之段, set报之段] = useState<number | null>(null);

  useEffect(() => {
    loadCityPack(cityId).then(setPack).catch((e: Error) => setLoadError(e.message));
  }, [cityId]);

  // 址所載之狀,必待囊至而後驗 —— 囊未至則節之有無不可知。
  useEffect(() => {
    if (!pack) return;
    if (址之初.flags) setFlags(址之初.flags);
    if (址之初.hourIdx != null && 址之初.hourIdx < pack.manifest.hour_buckets.length) {
      setHourIdx(址之初.hourIdx);
    }
    const 驗 = 驗其節(pack, 址之初.origin, 址之初.dest);
    if (驗.origin != null) setOrigin(驗.origin);
    if (驗.dest != null) setDest(驗.dest);
    if (驗.失之節.length > 0) set陳鏈(true);
    // 一囊一驗。址之初為 useMemo,其身不變。
  }, [pack, 址之初]);

  useEffect(() => {
    if (!pack) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    fetchCurrentTempC((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(setTemp);
    // 官之警。取之不得則其狀載其誤,界面明告之,不作無警論。
    取警((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(set警狀);
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
    const r = computeRoute(pack, flags, origin, dest, hourIdx, temp.tempC, 罰, 暑之底(警狀.警));
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
      set阻(null);
    } else {
      // 無路,則問其何以無路。此第二次之尋不設身之限,故必得眾人之路 —— 若亦無,
      // 則其斷非身之故。此路僅於無路之時算之,故其費不入常途。
      set阻(阻之故(pack, flags, origin, dest, hourIdx, temp.tempC));
      setStatus(
        "No route exists for this profile between those points. " +
          "The barrier is accessibility, not distance.",
      );
    }
  }, [pack, origin, dest, flags, hourIdx, temp, 罰, 警狀]);

  // 狀既定,則書之於址。用 replaceState —— 每動一滑桿而增一 history,則返回鍵不可用。
  useEffect(() => {
    if (!pack) return;
    const h = 成址({ city: cityId, view: "route", origin, dest, flags, hourIdx });
    if (h !== location.hash) history.replaceState(null, "", h);
  }, [pack, cityId, origin, dest, flags, hourIdx]);

  // 同一路,他時行之,可省幾何。再計其曝而已,不再尋路 —— 八次尋路者三百餘毫秒。
  const 遲之利 = useMemo(
    () => (result && pack
      ? 算遲行之利(result.edges, hourIdx, pack.manifest.hour_buckets.length)
      : null),
    [result, hourIdx, pack],
  );

  /*
    路之四數。其長與其曝,文中已載,然埋於句中 —— 數之大者當先見,而後其文釋之。
    The route's numbers already existed in prose ("Route found: 1,240 m, peak sun
    exposure 62%") where they read as sentence, not as measurement. Every value
    here is one the reader is deciding on.

    蔭之界取零點三四,與曝之色同 —— 帶與數不可異其語,不然則所畫與所數相違。
    The 0.34 threshold is 曝之色's, deliberately: the strip below this row is
    painted with the same cut, so a different one here would make the picture and
    the number disagree on screen.
  */
  const 路之數 = useMemo(() => {
    if (!result) return null;
    const 總 = result.totalLength_m;
    const 蔭米 = result.edges.reduce(
      (s, e) => s + (effectiveExposure(e, hourIdx) < 0.34 ? e.length_m : 0),
      0,
    );
    return {
      長: 總 >= 1000 ? `${(總 / 1000).toFixed(1)} km` : `${Math.round(總)} m`,
      峰: `${Math.round(result.maxExposure * 100)}%`,
      蔭: 總 > 0 ? `${Math.round((蔭米 / 總) * 100)}%` : "—",
      未驗: result.edges.filter((e) => e.confidence !== "high").length,
    };
  }, [result, hourIdx]);

  // 报事以段之號為鑰,俾行程之每步得問其有报否。
  const 段之报 = useMemo(() => {
    const m = new Map<number, typeof 报列>();
    for (const r of 报列) {
      const 有 = m.get(r.edge_id);
      if (有) 有.push(r);
      else m.set(r.edge_id, [r]);
    }
    return m;
  }, [报列]);

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
      {/* 城之名已在頂帶,不復言之。 */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Route</h1>
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

      {陳鏈 && (
        <p role="alert" className="mt-2 rounded-lg border border-midsun/40 bg-midsun-soft px-4 py-3 text-sm">
          <span className="font-semibold">That shared link is out of date.</span>{" "}
          One or both of its points no longer exist in this city's sidewalk data,
          which is rebuilt as OpenStreetMap changes. Nothing has been guessed —
          choose your points again below.
        </p>
      )}

      {阻 && (
        <section
          aria-label="Why there is no route"
          className="mt-2 rounded-lg border border-fullsun/40 bg-fullsun-soft px-4 py-3 text-sm"
        >
          {阻.眾人亦不可至 ? (
            <p>
              These two points are not connected by mapped sidewalk for{" "}
              <span className="font-semibold">anyone</span>, on any profile. That
              is a gap in the map or a genuinely severed network, not an
              accessibility barrier.
            </p>
          ) : (
            <>
              <p className="font-semibold">
                An unrestricted walker can make this trip. Your profile cannot,
                because of{" "}
                <span className="数">{阻.總數}</span>{" "}
                {阻.總數 === 1 ? "segment" : "segments"} on that route.
              </p>
              <ul className="mt-1.5">
                {阻.項.map((x) => (
                  <li key={x.類} className="mt-0.5">
                    <span className="数 font-semibold">{x.數}</span>{" "}
                    {x.數 === 1 ? "segment" : "segments"} — {阻之文[x.類]}
                    {x.類 === "steps" && x.階數 != null && (
                      <> (<span className="数">{x.階數}</span> steps counted)</>
                    )}
                    , <span className="数">{Math.round(x.米)}</span> m in total
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Segment locations are not named here — OpenStreetMap street names
                are not carried in this city pack.
              </p>
            </>
          )}
        </section>
      )}

      <HeatAlert 狀={警狀} />

      {temp.estimated && (
        <p role="note" className="mt-2 text-sm text-midsun">
          Live weather is unavailable — routing is using an estimated{" "}
          <span className="数">{temp.tempC}</span>°C.
        </p>
      )}

      <div className="mt-4 grid items-start gap-4 md:grid-cols-[minmax(260px,1fr)_2fr]">
        {/*
          諸器共一地。前此各浮於頁,而其中獨 profile 有框,故如散置而非一列。
          The controls previously floated loose on the page background with only
          the profile fieldset bordered, which read as accidental rather than as
          one panel of inputs.
        */}
        <div ref={器} className="rounded-xl border border-line bg-paper p-4">
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

      {路之數 && result && (
        <section
          ref={數列}
          aria-label="Route summary"
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <MetricCard 題="Distance" 數={路之數.長} 註={`${result.edges.length} segments`} />
          <MetricCard 題="Peak sun exposure" 數={路之數.峰} 註={`at ${hourLabel}`} />
          <MetricCard 題="Shaded" 數={路之數.蔭} 註="of route length" />
          <MetricCard
            題="Unverified segments"
            數={String(路之數.未驗)}
            註="accessibility not tagged in OpenStreetMap"
          />
        </section>
      )}

      {result && (
        <section aria-label="Route detail" className="mt-6">
          <h2 className="题-accent text-lg font-semibold">Sun along this route</h2>
          <ExposureStrip edges={result.edges} hourIdx={hourIdx} className="mt-2" />

          {遲之利 && 遲之利.省之比 >= 0.1 && pack && (
            <p className="mt-2 rounded-lg border border-shade/30 bg-shade-soft px-3 py-2 text-sm">
              Walking this same route at{" "}
              <span className="数 font-semibold">
                {String(pack.manifest.hour_buckets[遲之利.善之時序]).padStart(2, "0")}:00
              </span>{" "}
              instead would cut your sun exposure by{" "}
              <span className="数 font-semibold">
                {Math.round(遲之利.省之比 * 100)}%
              </span>
              . This is the same path, later — not a different route.
            </p>
          )}

          <h2 className="题-accent mt-6 text-lg font-semibold">Directions</h2>
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
                    {/*
                      曝之條。色不獨任其義 —— step.text 已載其米與其險,
                      而 title 與 sr-only 並載其文,故色盲與讀屏皆不失。
                      Colour never carries meaning alone: the bar is decorative
                      reinforcement of text that already says everything.
                    */}
                    <span
                      aria-hidden
                      title={曝之文(effectiveExposure(step.edge, hourIdx))}
                      className="mr-2 inline-block h-2.5 w-5 shrink-0 rounded-sm align-middle"
                      style={{ backgroundColor: 曝之色(effectiveExposure(step.edge, hourIdx)) }}
                    />
                    <span className="sr-only">
                      {曝之文(effectiveExposure(step.edge, hourIdx))}:{" "}
                    </span>
                    {step.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => set报之段(step.edge.id)}
                    aria-pressed={报之段 === step.edge.id}
                    className={`min-h-9 shrink-0 rounded-full border px-3 py-1 text-xs transition-colors duration-200 ease-quint ${
                      报之段 === step.edge.id
                        ? "border-accent-ink bg-accent-wash font-semibold text-accent-ink"
                        : "border-line text-muted-foreground hover:border-accent-ink/40 hover:bg-accent-wash hover:text-accent-ink"
                    }`}
                  >
                    {报之段 === step.edge.id ? "Selected" : "Report this"}
                  </button>
                </div>
                {(() => {
                  const st = 段狀.get(step.edge.id);
                  if (!st || st.總數 === 0) return null;
                  const 类 = [...new Set(
                    (段之报.get(step.edge.id) ?? []).map((r) => r.kind),
                  )].map((k) => k.replace(/_/g, " "));
                  return (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className={st.罰 > 0 ? "text-midsun" : "text-muted-foreground"}>
                        <span className="数 font-semibold">{st.總數}</span>{" "}
                        {st.總數 === 1 ? "report" : "reports"}
                        {st.確認 > 0 && (
                          <>
                            {" ("}
                            <span className="数">{st.確認}</span> confirmed
                            {st.存疑 > 0 && (
                              <>
                                {", "}
                                <span className="数">{st.存疑}</span> disputed
                              </>
                            )}
                            {")"}
                          </>
                        )}
                        {st.確認 === 0 && st.存疑 > 0 && (
                          <>
                            {" ("}
                            <span className="数">{st.存疑}</span> disputed{")"}
                          </>
                        )}
                        {" — "}
                        {类.join(", ")}
                        {st.最新 != null && `, latest ${幾時之前(st.最新)}`}
                        {/* 罰既歸零,則不當使人以為此段猶避之。 */}
                        {st.罰 === 0 && " — no longer affecting routing"}
                      </span>
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={!就緒}
                          onClick={() => 表態(step.edge.id, "confirmed", step.edge.is_steps ? "other" : "sidewalk_blocked")}
                          className="min-h-9 rounded-full border border-line px-2.5 text-xs transition-colors duration-150 ease-quint hover:border-accent-ink hover:text-accent-ink disabled:opacity-50"
                        >
                          Still there
                        </button>
                        <button
                          type="button"
                          disabled={!就緒}
                          onClick={() => 表態(step.edge.id, "disputed", step.edge.is_steps ? "other" : "sidewalk_blocked")}
                          className="min-h-9 rounded-full border border-line px-2.5 text-xs transition-colors duration-150 ease-quint hover:border-accent-ink hover:text-accent-ink disabled:opacity-50"
                        >
                          Fixed now
                        </button>
                      </span>
                    </div>
                  );
                })()}
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
          {pack.manifest.buildings_assumed_height ? (() => {
            const 總 = pack.manifest.buildings_total ?? 0;
            const 補 = pack.manifest.buildings_assumed_height;
            const 率 = 總 ? 補 / 總 : 0;
            return (
              <>
                {" "}
                <span className={率 > 0.3 ? "font-semibold text-midsun" : ""}>
                  {補} of them ({Math.round(率 * 100)}%) have no height in OpenStreetMap
                  and were assumed to be 7 storeys
                </span>
                {率 > 0.3
                  ? ", so shade here is substantially inferred and individual segments" +
                    " should be treated as rough."
                  : ", so shade near them may be over- or under-stated."}
              </>
            );
          })() : null}
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
