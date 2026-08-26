export function BudgetSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <label htmlFor="budget" style={{ fontWeight: 600, display: "block" }}>
        Sun-exposure budget:{" "}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{value} sun-metres</span>
      </label>
      <input
        id="budget"
        type="range"
        min={100}
        max={3000}
        step={50}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        aria-valuetext={`${value} sun-metres`}
        style={{ width: "100%" }}
      />
      <small style={{ color: "var(--muted)" }}>
        One sun-metre is one metre walked in full sun at peak heat. This budget is a
        rough planning heuristic, not a clinical threshold — follow your own medical
        guidance.
      </small>
    </div>
  );
}
