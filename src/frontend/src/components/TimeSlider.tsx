import { Slider } from "@/components/ui/slider";
import { useSliderDraft } from "../hooks/useSliderDraft";

export function TimeSlider({
  buckets,
  index,
  onChange,
}: {
  buckets: number[];
  index: number;
  onChange: (i: number) => void;
}) {
  // 曳則但易其籤,釋乃重算 —— 見 useSliderDraft。
  const 桿 = useSliderDraft(index, onChange);
  const hour = buckets[桿.值];
  const label = `${String(hour).padStart(2, "0")}:00`;
  return (
    <div className="my-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span id="time-label" className="text-sm font-semibold">
          Time of day
        </span>
        <span className="数 h-xs text-accent-ink">{label}</span>
      </div>
      <Slider
        className="[&_[data-slot=slider-range]]:bg-accent-ink"
        min={0}
        max={buckets.length - 1}
        step={1}
        value={[桿.值]}
        onValueChange={桿.onValueChange}
        onValueCommit={桿.onValueCommit}
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
