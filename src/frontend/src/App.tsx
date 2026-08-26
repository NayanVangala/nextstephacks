import { useState } from "react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";
import { ReportView } from "./views/ReportView";

type 之view = "route" | "reach" | "report";

const 之tabs: { id: 之view; label: string }[] = [
  { id: "route", label: "Route" },
  { id: "reach", label: "Reach" },
  { id: "report", label: "Report" },
];

export default function App() {
  const [view, setView] = useState<之view>("route");
  return (
    <>
      <nav
        aria-label="Views"
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "1rem 1rem 0",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {之tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            aria-current={view === t.id ? "page" : undefined}
            style={view === t.id ? { background: "var(--panel)", fontWeight: 600 } : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {view === "route" && <RouteView cityId="la" />}
      {view === "reach" && <ReachView cityId="la" />}
      {view === "report" && <ReportView cityId="la" />}
    </>
  );
}
