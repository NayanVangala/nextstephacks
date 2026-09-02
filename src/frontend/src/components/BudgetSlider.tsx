import { Slider } from "@/components/ui/slider";
import { useSliderDraft } from "../hooks/useSliderDraft";

export function BudgetSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  // 曳則但易其數,釋乃重算 —— reach 之泛遍其全圖,不可每格一發。
  const 桿 = useSliderDraft(value, onChange);
  return (
    <div className="my-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span id="budget-label" className="text-sm font-semibold">
          Sun-exposure budget
        </span>
        <span className="数 h-xs text-accent-ink">{桿.值}</span>
      </div>
      <Slider
        className="[&_[data-slot=slider-range]]:bg-accent-ink"
        min={100}
        max={3000}
        step={50}
        value={[桿.值]}
        onValueChange={桿.onValueChange}
        onValueCommit={桿.onValueCommit}
        thumbAriaLabelledBy="budget-label"
        thumbAriaValueText={`${桿.值} sun-meters`}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        One sun-meter is one meter walked in full sun at peak heat. This budget is a
        rough planning heuristic, not a clinical threshold — follow your own medical
        guidance.
      </p>
    </div>
  );
}
