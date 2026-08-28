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

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/*
        越navigation而直至其文。左列之器十有餘,鍵盤之人每易 view 皆須歷之而後
        及其果 —— 一鏈可省之。隱而不奪其位,受焦則見。
      */}
      <a
        href="#主"
        className="越"
      >
        Skip to main content
      </a>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pt-4">
        <nav aria-label="Views" className="flex gap-1">
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
                    ? "font-semibold text-accent-ink"
                    : "text-muted-foreground hover:bg-panel hover:text-ink"
                }`}
              >
                {t.label}
                {當 && (
                  <motion.span
                    layoutId="tab-underline"
                    transition={減動 ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-ink"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 pb-2">
          <label htmlFor="city" className="text-xs text-muted-foreground">
            City
          </label>
          <select
            id="city"
            value={city}
            onChange={(ev) => setCity(ev.target.value)}
            className="min-h-11 rounded-md border border-line bg-paper px-2.5 py-1 text-sm"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <SignIn />
          <button
            type="button"
            onClick={() => {
              location.hash = "";
              set入app(false);
              scrollTo({ top: 0 });
            }}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-ink"
          >
            About
          </button>
        </div>
      </div>

      <div id="主" ref={面} tabIndex={-1}>
        {view === "route" && <RouteView key={city} cityId={city} />}
        {view === "reach" && <ReachView key={city} cityId={city} />}
        {view === "report" && <ReportView key={city} cityId={city} />}
        {view === "index" && <IndexView key={city} cityId={city} />}
      </div>
    </div>
  );
}
