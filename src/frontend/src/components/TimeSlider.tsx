import { Slider } from "@/components/ui/slider";

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
    <div className="my-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span id="time-label" className="text-sm font-semibold">
          Time of day
        </span>
        <span className="数 text-lg font-semibold text-accent-ink">{label}</span>
      </div>
      <Slider
        className="[&_[data-slot=slider-range]]:bg-accent-ink"
        min={0}
        max={buckets.length - 1}
        step={1}
        value={[index]}
        onValueChange={([v]) => onChange(v)}
        thumbAriaLabelledBy="time-label"
        thumbAriaValueText={label}
      />
      <div aria-hidden className="数 mt-1 flex justify-between text-xs text-muted-foreground">
        {buckets.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  );
}
