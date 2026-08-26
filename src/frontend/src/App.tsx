import { useState } from "react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";

export default function App() {
  const [view, setView] = useState<"route" | "reach">("route");
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
        <button
          type="button"
          onClick={() => setView("route")}
          aria-current={view === "route" ? "page" : undefined}
          style={view === "route" ? { background: "var(--panel)", fontWeight: 600 } : undefined}
        >
          Route
        </button>
        <button
          type="button"
          onClick={() => setView("reach")}
          aria-current={view === "reach" ? "page" : undefined}
          style={view === "reach" ? { background: "var(--panel)", fontWeight: 600 } : undefined}
        >
          Reach
        </button>
      </nav>
      {view === "route" ? <RouteView cityId="la" /> : <ReachView cityId="la" />}
    </>
  );
}
