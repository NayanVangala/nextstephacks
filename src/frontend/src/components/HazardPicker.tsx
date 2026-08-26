import { HAZARDS, type Hazard } from "../data/hazards";

export function HazardPicker({
  value,
  onChange,
}: {
  value: Hazard;
  onChange: (h: Hazard) => void;
}) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <label htmlFor="hazard" style={{ fontWeight: 600, display: "block" }}>
        Scenario
      </label>
      <select
        id="hazard"
        value={value.id}
        onChange={(ev) =>
          onChange(HAZARDS.find((h) => h.id === ev.target.value) ?? HAZARDS[0])}
        style={{ width: "100%", padding: "0.4rem", font: "inherit" }}
      >
        {HAZARDS.map((h) => (
          <option key={h.id} value={h.id}>
            {h.label}
          </option>
        ))}
      </select>
      <small style={{ color: "var(--muted)" }}>
        {value.description}
        {value.hypothetical ? " This is a what-if, not a live alert." : ""}
      </small>
    </div>
  );
}
