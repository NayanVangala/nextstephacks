export function TimeSlider({
  buckets,
  index,
  onChange,
}: {
  buckets: number[];
  index: number;
  onChange: (i: number) => void;
}) {
  const hour = buckets[index];
  const label = `${String(hour).padStart(2, "0")}:00`;
  return (
    <div style={{ margin: "1rem 0" }}>
      <label htmlFor="time-slider" style={{ fontWeight: 600 }}>
        Time of day: <span style={{ fontVariantNumeric: "tabular-nums" }}>{label}</span>
      </label>
      <input
        id="time-slider"
        type="range"
        min={0}
        max={buckets.length - 1}
        step={1}
        value={index}
        onChange={(ev) => onChange(Number(ev.target.value))}
        aria-valuetext={label}
        style={{ width: "100%" }}
      />
      <div
        aria-hidden="true"
        style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#52525b" }}
      >
        {buckets.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  );
}
