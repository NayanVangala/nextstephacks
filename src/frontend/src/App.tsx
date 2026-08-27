import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";
import { ReportView } from "./views/ReportView";
import { Landing } from "./landing/Landing";
import { CITIES, 預設之城 } from "./data/cities";

type 之view = "route" | "reach" | "report";

const 之tabs: { id: 之view; label: string; blurb: string }[] = [
  { id: "route", label: "Route", blurb: "What is my safest path right now?" },
  { id: "reach", label: "Reach", blurb: "What can I get to, and can I get out?" },
  { id: "report", label: "Report", blurb: "Where does this city fail?" },
];

export default function App() {
  const [view, setView] = useState<之view>("route");
  const [city, setCity] = useState(預設之城);
  // hash 為路:俾 landing 與 app 各可直連,而不需 router。
  const [入app, set入app] = useState(() => location.hash === "#/app");
  const 減動 = useReducedMotion();

  useEffect(() => {
    const 聽 = () => set入app(location.hash === "#/app");
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
                className={`relative px-3 py-2 text-sm transition-colors sm:px-4 ${
                  當 ? "font-semibold text-ink" : "text-muted-foreground hover:text-ink"
                }`}
              >
                {t.label}
                {當 && (
                  <motion.span
                    layoutId="tab-underline"
                    transition={減動 ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-x-2 -bottom-px h-0.5 bg-ink"
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
            className="rounded-md border border-line bg-paper px-2 py-1 text-sm"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
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

      {view === "route" && <RouteView key={city} cityId={city} />}
      {view === "reach" && <ReachView key={city} cityId={city} />}
      {view === "report" && <ReportView key={city} cityId={city} />}
    </div>
  );
}
