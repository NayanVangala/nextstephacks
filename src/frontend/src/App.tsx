import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";
import { ReportView } from "./views/ReportView";
import { IndexView } from "./views/IndexView";
import { Landing } from "./landing/Landing";
import { CITIES, 預設之城 } from "./data/cities";
import { 解址 } from "./data/路之址";
import { SignIn } from "./auth/SignIn";
import { useEnter } from "./motion/useEnter";

type 之view = "route" | "reach" | "report" | "index";

const 之tabs: { id: 之view; label: string; blurb: string }[] = [
  { id: "route", label: "Route", blurb: "What is my safest path right now?" },
  { id: "reach", label: "Reach", blurb: "What can I get to, and can I get out?" },
  { id: "report", label: "Report", blurb: "Where does this city fail?" },
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
  // hash 為路:俾 landing 與 app 各可直連,而不需 router。
  const [入app, set入app] = useState(() => location.hash.startsWith("#/app"));
  const 減動 = useReducedMotion();
  // 易 view 或易城,則其面重入 —— 使人知所視者已換。
  const 面 = useEnter<HTMLDivElement>({ 位移: 10, 憑: `${view}|${city}` });

  useEffect(() => {
    const 聽 = () => set入app(location.hash.startsWith("#/app"));
    addEventListener("hashchange", 聽);
    return () => removeEventListener("hashchange", 聽);
  }, []);

  const 退 = () => {
    location.hash = "";
    set入app(false);
    scrollTo({ top: 0 });
  };

  if (!入app) {
    return (
      <Landing
        onEnter={() => {
          location.hash = "#/app";
          set入app(true);
          scrollTo({ top: 0 });
        }}
      />
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
        頂之chrome。黑者,承 landing 之色也 —— 二者本一物,而前此一黑一淡,
        入之如易其站。今存一黑帶於上,則其一貫可見,而其下猶淡:圖與數賴之。
        A dark chrome bar over a light workspace. The landing is black and the
        tool was flat white, so entering it read as arriving at a different
        product. The bar carries the identity across; the working surface stays
        light because map tiles and dense figures need it.

        z 必逾千 —— leaflet 之控在千,不然則其鈕浮於此帶之上。
        MUST outrank Leaflet: its controls sit at z-index 1000, so anything less
        here lets the zoom buttons render on top of the sticky header.
      */}
      <header className="chrome sticky top-0 z-[1200] text-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
            <button
              type="button"
              onClick={退}
              aria-label="Passable — back to the overview"
              className="text-sm font-semibold uppercase tracking-wide transition-opacity duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-60"
            >
              Passable
            </button>

            <span aria-hidden className="h-4 w-px bg-white/20" />

            <label htmlFor="city" className="sr-only">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(ev) => setCity(ev.target.value)}
              // 其單亦須從其色,不然則白底黑字之單躍於黑帶之上。
              style={{ colorScheme: "dark" }}
              className="-ml-1 min-h-9 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white/25 hover:bg-white/10"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <div className="ml-auto">
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
                    className={`relative min-h-11 rounded-t-md px-3 py-2 text-sm transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] sm:px-4 ${
                      當
                        ? "font-semibold text-white"
                        : "text-white/55 hover:bg-white/10 hover:text-white"
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
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white"
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
            <p className="hidden shrink-0 pb-2.5 text-xs text-white/60 lg:block">
              {當之blurb}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4">
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
