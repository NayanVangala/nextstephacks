import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";
import { ReportView } from "./views/ReportView";

type 之view = "route" | "reach" | "report";

const 之tabs: { id: 之view; label: string; blurb: string }[] = [
  { id: "route", label: "Route", blurb: "What is my safest path right now?" },
  { id: "reach", label: "Reach", blurb: "What can I get to, and can I get out?" },
  { id: "report", label: "Report", blurb: "Where does this city fail?" },
];

export default function App() {
  const [view, setView] = useState<之view>("route");
  // 動須讓於 reduced-motion。此物之本旨也。
  const 減動 = useReducedMotion();

  return (
    <div className="mx-auto max-w-5xl px-4">
      <nav aria-label="Views" className="flex gap-1 border-b border-line pt-4">
        {之tabs.map((t) => {
          const 當 = view === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              aria-current={當 ? "page" : undefined}
              title={t.blurb}
              className={`relative px-4 py-2 text-sm transition-colors ${
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

      {view === "route" && <RouteView cityId="la" />}
      {view === "reach" && <ReachView cityId="la" />}
      {view === "report" && <ReportView cityId="la" />}
    </div>
  );
}
