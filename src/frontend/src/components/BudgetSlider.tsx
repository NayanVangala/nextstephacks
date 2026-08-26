import { Slider } from "@/components/ui/slider";

export function BudgetSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="my-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span id="budget-label" className="text-sm font-semibold">
          Sun-exposure budget
        </span>
        <span className="数 text-lg font-semibold">{value}</span>
      </div>
      <Slider
        min={100}
        max={3000}
        step={50}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        thumbAriaLabelledBy="budget-label"
        thumbAriaValueText={`${value} sun-metres`}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        One sun-metre is one metre walked in full sun at peak heat. This budget is a
        rough planning heuristic, not a clinical threshold — follow your own medical
        guidance.
      </p>
    </div>
  );
}
