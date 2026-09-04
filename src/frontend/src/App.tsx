import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";
import { ReportView } from "./views/ReportView";
import { IndexView } from "./views/IndexView";
import { Landing } from "./landing/Landing";
import { InfoPage, 解說之頁, type 說之頁 } from "./landing/InfoPage";
import { CITIES, 預設之城 } from "./data/cities";
import { 解址 } from "./data/路之址";
import { SignIn } from "./auth/SignIn";
import { ThemeToggle } from "./components/ThemeToggle";
import { useEnter } from "./motion/useEnter";

type 之view = "route" | "reach" | "report" | "index";

const 之tabs: { id: 之view; label: string; blurb: string }[] = [
  { id: "route", label: "Route", blurb: "What is my safest path right now?" },
  { id: "reach", label: "Reach", blurb: "What can I get to, and can I get out?" },
  { id: "report", label: "City audit", blurb: "Where does this city fail?" },
  { id: "index", label: "Index", blurb: "Which neighbourhoods are cut off?" },
];

export default function App() {
  // 址所載之城與 view 先於其預設 —— 分享之鏈必落於其所指之處。
  const 初 = 解址();
  const [view, setView] = useState<之view>(
    (["route", "reach", "report", "index"] as const).includes(初.view as never)
      ? (初.view as 之view)
      : "route",
  );
  const [city, setCity] = useState(
    初.city && CITIES.some((c) => c.id === 初.city) ? 初.city : 預設之城,
  );
  // hash 為路:俾 landing、說之頁、app 各可直連,而不需 router。
  const [入app, set入app] = useState(() => location.hash.startsWith("#/app"));
  const [說頁, set說頁] = useState<說之頁 | null>(() => 解說之頁());
  const 減動 = useReducedMotion();
  // 易 view 或易城,則其面重入 —— 使人知所視者已換。
  const 面 = useEnter<HTMLDivElement>({ 位移: 10, 憑: `${view}|${city}` });

  useEffect(() => {
    const 聽 = () => {
      set入app(location.hash.startsWith("#/app"));
      set說頁(解說之頁());
      /*
        城與 view 亦須隨其址 —— 前此但取之於初,而後不復顧。
        故其址易而其面不易:貼一 #/app?c=den 之鏈於已開之頁,猶見洛城;
        前進後退於二城之間,亦不動。初載則無此病,故易隱。
        MUST re-read city and view here, not only at mount. They were read once
        from the initial hash and never again, so pasting a #/app?c=den link
        into an already-open tab kept showing Los Angeles, and Back/Forward
        between two cities moved the URL without moving the page. A cold load
        worked, which is what hid it.
      */
      const 址 = 解址();
      if (址.city && CITIES.some((c) => c.id === 址.city)) setCity(址.city);
      if (址.view && 之tabs.some((t) => t.id === 址.view)) setView(址.view as 之view);
    };
    addEventListener("hashchange", 聽);
    return () => removeEventListener("hashchange", 聽);
  }, []);

  /*
    城與 view 之記,主於此。
    前此惟 RouteView 書其址,而其 v 恆書 "route" —— 故自 Route 易至 Report 而
    分享之,其鏈仍歸於 Route;於 Report 之中易其城,其鏈仍指舊城。
    二參既為此處之狀,則當自此處書之;其餘(起訖、身、時)仍歸 RouteView。
    Only RouteView wrote the hash, with v hardcoded to "route", so switching to
    the Report tab and copying the URL gave a link back to Route, and changing
    city on any other tab left c stale. These two params are this component's
    state, so this is where they belong; RouteView still owns o/d/p/h.
  */
  useEffect(() => {
    if (!入app) return;
    const i = location.hash.indexOf("?");
    const q = new URLSearchParams(i < 0 ? "" : location.hash.slice(i + 1));
    if (q.get("c") === city && q.get("v") === view) return;
    q.set("c", city);
    q.set("v", view);
    // replace,不 push —— 易其 tab 非一往,不當塞其後退之路。
    history.replaceState(null, "", `#/app?${q.toString()}`);
  }, [入app, city, view]);

  const 退 = () => {
    // replaceState 而不書其 hash —— 直書之則遺一孤井(…/#),且每出入各塞一history。
    // 出、入、出、入,則欲離此頁者須退四次。入者當塞其一(其往也),出者不當。
    history.replaceState(null, "", location.pathname + location.search);
    set入app(false);
    set說頁(null);
    scrollTo({ top: 0 });
  };

  const 入 = () => {
    location.hash = "#/app";
    set入app(true);
    set說頁(null);
    scrollTo({ top: 0 });
  };

  // 說之頁先於 app —— 器之中亦可指之,而不當因其 hash 之殘而落於器。
  if (說頁 && !入app) return <InfoPage 頁={說頁} onEnter={入} />;

  if (!入app) {
    return (
      <Landing onEnter={入} />
    );
  }

  const 當之blurb = 之tabs.find((t) => t.id === view)?.blurb ?? "";

  return (
    <>
      {/*
        越navigation而直至其文。左列之器十有餘,鍵盤之人每易 view 皆須歷之而後
        及其果 —— 一鏈可省之。隱而不奪其位,受焦則見。
      */}
      <a href="#主" className="越">
        Skip to main content
      </a>

      {/*
        頂之chrome。其色深於其地,故為帶而非地之一段。
        其常既為暗,則此帶不復為「黑帶於淡地」,乃暗中之更暗者 ——
        其別在一髮之界,見 index.css 之 .chrome。
        The chrome sits a step darker than the workspace. Now that dark is the
        base theme this is no longer a black bar over white; the separation is a
        hairline, which is why .chrome carries a border in the dark palette.

        z 必逾千 —— leaflet 之控在千,不然則其鈕浮於此帶之上。
        MUST outrank Leaflet: its controls sit at z-index 1000, so anything less
        here lets the zoom buttons render on top of the sticky header.
      */}
      <header className="chrome sticky top-0 z-[1200] text-ink">
        <div className="grid-container">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
            <button
              type="button"
              onClick={退}
              aria-label="Passable — back to the overview"
              className="text-sm font-semibold uppercase tracking-wide transition-opacity duration-150 ease-quint hover:opacity-60"
            >
              Passable
            </button>

            <span aria-hidden className="h-4 w-px bg-ink/20" />

            <label htmlFor="city" className="sr-only">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(ev) => setCity(ev.target.value)}
              // 其單從其地。報頭既為紙,則其單亦為紙 —— 前此釘 dark,為暗帶而設。
              style={{ colorScheme: "light" }}
              className="-ml-1 min-h-11 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium transition-colors hover:border-ink/25 hover:bg-ink/10"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
              {/*
                說之頁之鏈。疑生於用之際,不生於 landing 之上 —— 故其鏈當在此,
                不獨在前頁之末。
                Confusion happens here, not on the marketing page, so the guide
                has to be reachable from inside the tool and not only from the
                landing footer.
              */}
              <a
                href="#/help"
                className="min-h-11 rounded-md px-2 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink"
              >
                Help
              </a>
              {/* 題之擇。暗為其本,故此鈕為所以出之,非所以入之。 */}
              <ThemeToggle />
              <SignIn 暗 />
            </div>
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-6">
            <nav aria-label="Views" className="flex gap-0.5">
              {之tabs.map((t) => {
                const 當 = view === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setView(t.id)}
                    aria-current={當 ? "page" : undefined}
                    title={t.blurb}
                    className={`relative min-h-11 rounded-t-md px-3 py-2 text-sm transition-colors sm:px-4 ${
                      當
                        ? "font-semibold text-ink"
                        : "text-ink/70 hover:bg-ink/10 hover:text-ink"
                    }`}
                  >
                    {t.label}
                    {當 && (
                      <motion.span
                        layoutId="tab-underline"
                        transition={
                          減動
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 32 }
                        }
                        className="absolute inset-x-2 bottom-0 h-[3px] bg-ink"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/*
              每 view 各答一問。此文前此但存於 title,懸之而後見 —— 而其為
              全app最明之語,不當藏。窄屏則去之,其位不足。
              Each view answers one question. That copy previously lived only in
              a title attribute, visible on hover and to nobody on a touchscreen.
            */}
            <p className="hidden shrink-0 pb-2.5 text-xs text-ink/70 lg:block">
              {當之blurb}
            </p>
          </div>
        </div>
      </header>

      {/*
        器與 landing 同其格。前此器為 max-w-5xl(一〇二四),而 landing 之
        .grid-container 為一二〇rem —— 於一四四〇之屏,其面自一三四四縮為九七六。
        故人一擊「Open the tool」,其物立縮四分之一有奇,如二物之相代。
        The tool used max-w-5xl while the landing uses the 1920 grid: clicking
        the CTA visibly shrank the content from 1344px to 976px, which reads as
        arriving at a different product. One grid across both surfaces.
      */}
      {/* 地之暈。見 index.css 之「器之地」—— 其色即曝之二端,故非無謂之飾。 */}
      <div aria-hidden className="器之暈" />

      <div className="grid-container">
        {/* 帶既黏於上,則跳之的須讓其高,不然其題隱於帶下。 */}
        <div id="主" ref={面} tabIndex={-1} className="scroll-mt-28">
          {view === "route" && <RouteView key={city} cityId={city} />}
          {view === "reach" && <ReachView key={city} cityId={city} />}
          {view === "report" && <ReportView key={city} cityId={city} />}
          {view === "index" && <IndexView key={city} cityId={city} />}
        </div>
      </div>
    </>
  );
}
